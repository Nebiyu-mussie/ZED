import './lib/loadEnv.js';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectMongo } from './lib/mongo.js';
import cors from 'cors';
import {
  User,
  Driver,
  Delivery,
  Order,
  OrderEvent,
  Address,
  Wallet,
  WalletTransaction,
  Reward,
  RewardTransaction,
  DriverLocation,
  DispatchOffer,
  SupportTicket,
  Rating,
  Notification,
  NotificationPreference,
  Zone,
  Promo,
  PromoRedemption,
  PricingRule,
  AuditLog,
  DriverBlacklist,
  Product,
  PasswordReset,
} from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'zemen-express-secret-key';
const ADMIN_ROLES = ['admin', 'manager'] as const;
const SUPER_ADMIN_ROLES = ['super_admin'] as const;
const ALLOW_OUT_OF_ZONE = process.env.ALLOW_OUT_OF_ZONE === 'true';

const ORDER_STATUSES = [
  'draft',
  'confirmed',
  'driver_assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'failed',
] as const;

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['driver_assigned', 'cancelled'],
  driver_assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'failed', 'returned'],
  in_transit: ['delivered', 'failed', 'returned'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  returned: ['completed'],
  failed: ['completed'],
};

const VALID_SERVICE_TYPES = ['express', 'same_day', 'next_day', 'scheduled'];
const VALID_ORDER_PAYMENT_METHODS = ['cash', 'chapa'] as const;
const PASSWORD_RESET_OTP_TTL_MINUTES = Number(process.env.PASSWORD_RESET_OTP_TTL_MINUTES || 10);
const PASSWORD_RESET_EMAIL_FROM = process.env.PASSWORD_RESET_EMAIL_FROM || process.env.SMTP_USER || 'no-reply@zemen.local';
const APP_BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const PASSWORD_RESET_APP_URL = APP_BASE_URL;
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';
const CHAPA_API_BASE_URL = 'https://api.chapa.co/v1';

const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
const validatePhone = (phone: string) => /^\+?\d[\d\s-]{7,}$/.test(phone);
const normalizeAddressText = (value: string) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizePromoCode = (value: string) => String(value || '').trim().toUpperCase();
const maskEmail = (email: string) => {
  const [localPart = '', domain = ''] = String(email || '').split('@');
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) return `${localPart[0] || '*'}***@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
};
const generateNumericOtp = (length = 6) =>
  Array.from({ length })
    .map(() => Math.floor(Math.random() * 10).toString())
    .join('');
const hashOtp = (email: string, otp: string) =>
  crypto.createHash('sha256').update(`${String(email).toLowerCase().trim()}:${otp}`).digest('hex');
const dedupeNotifications = (items: any[]) => {
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const raw of items || []) {
    const signature = `${raw?.type || ''}|${raw?.title || ''}|${raw?.body || ''}|${new Date(raw?.created_at || 0).toISOString().slice(0, 16)}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    deduped.push(raw);
  }
  return deduped;
};
const sendPasswordResetOtpEmail = async (toEmail: string, otp: string) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const text = [
    'Zemen Express Password Reset',
    '',
    `Your OTP code is: ${otp}`,
    `This code expires in ${PASSWORD_RESET_OTP_TTL_MINUTES} minutes.`,
    '',
    `Reset page: ${PASSWORD_RESET_APP_URL}/forgot-password`,
  ].join('\n');

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[password-reset] OTP for ${toEmail}: ${otp}`);
    return { delivered: false, fallback: true };
  }

  // Lazy-load so the app can still run without SMTP config during setup.
  const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (modulePath: string) => Promise<any>;
  const nodemailerModule = await dynamicImport('nodemailer').catch(() => null);
  if (!nodemailerModule?.default?.createTransport) {
    console.log(`[password-reset] nodemailer unavailable. OTP for ${toEmail}: ${otp}`);
    return { delivered: false, fallback: true };
  }

  const transporter = nodemailerModule.default.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: PASSWORD_RESET_EMAIL_FROM,
    to: toEmail,
    subject: 'Your Zemen Express password reset OTP',
    text,
  });
  return { delivered: true, fallback: false };
};

const MAX_DISPATCH_ATTEMPTS = 6;
const MAX_ACTIVE_OFFERS_PER_DRIVER = 2;
const DRIVER_ARRIVAL_RADIUS_KM = Number(process.env.DRIVER_ARRIVAL_RADIUS_KM || 0.2);
const ENFORCE_DRIVER_PROXIMITY = process.env.ENFORCE_DRIVER_PROXIMITY !== 'false';

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculatePricing = (input: any, rule?: any, promo?: any) => {
  const baseFare = rule?.base_fare ?? 80;
  const distance = input.distanceKm ?? 6;
  const distanceFare = distance * (rule?.per_km ?? 12);
  const weight = Number(input.weight || 0);
  const weightSurcharge = weight * (rule?.weight_rate ?? 6);
  const sizeMultipliers: Record<string, number> = { small: 1, medium: 1.4, large: 1.9, xlarge: 2.5 };
  const sizeMultiplier = sizeMultipliers[input.size] || 1.4;
  const insuranceFee = input.insurance ? (baseFare + distanceFare) * 0.05 : 0;
  const expressFee = input.serviceType === 'express' ? 120 : input.serviceType === 'scheduled' ? 40 : 0;
  const surge = rule?.surge_multiplier ?? 1;
  const subtotal = ((baseFare + distanceFare + weightSurcharge) * sizeMultiplier + insuranceFee + expressFee) * surge;

  const promoCode = (input.promoCode || '').toUpperCase();
  let discount = 0;
  if (promo) {
    if (promo.min_spend && subtotal < promo.min_spend) {
      discount = 0;
    } else if (promo.discount_type === 'percent') {
      discount = Math.min(subtotal, subtotal * (promo.amount / 100));
    } else {
      discount = Math.min(subtotal, promo.amount);
    }
  } else if (promoCode === 'ZEMEN20') {
    discount = 60;
  } else if (promoCode === 'ZEMEN10') {
    discount = 35;
  }
  const beforeTax = Math.max(0, subtotal - discount);
  const vat = beforeTax * 0.15;
  const total = beforeTax + vat;

  return {
    baseFare,
    distanceFare,
    weightSurcharge,
    sizeMultiplier,
    insuranceFee,
    expressFee,
    discount,
    vat,
    total,
  };
};

const computeETA = (distanceKm: number, serviceType: string, driverAvailability: number) => {
  const baseMinutes = Math.max(15, distanceKm * 6);
  const serviceMultiplier = serviceType === 'express' ? 0.7 : serviceType === 'same_day' ? 0.9 : serviceType === 'next_day' ? 1.8 : 1.2;
  const availabilityMultiplier = driverAvailability <= 2 ? 1 : driverAvailability <= 5 ? 1.2 : 1.4;
  const etaMinutes = Math.round(baseMinutes * serviceMultiplier * availabilityMultiplier);
  return { etaMinutes, etaText: `${etaMinutes} min` };
};

const computeSlaStatus = (order: any) => {
  if (!order.eta_minutes || !order.created_at) return 'on_track';
  const created = new Date(order.created_at).getTime();
  const deadline = created + order.eta_minutes * 60 * 1000;
  const now = Date.now();
  if (now > deadline + 15 * 60 * 1000) return 'late';
  if (now > deadline) return 'at_risk';
  return 'on_track';
};

const toObjectId = (id: string | number) => new mongoose.Types.ObjectId(String(id));

const getZoneForCoords = async (lat?: number, lng?: number) => {
  if (!lat || !lng) return null;
  return Zone.findOne({
    lat_min: { $lte: lat },
    lat_max: { $gte: lat },
    lng_min: { $lte: lng },
    lng_max: { $gte: lng },
  }).lean();
};

const inferZoneFromAddress = async (pickup?: string, dropoff?: string) => {
  const text = `${pickup || ''} ${dropoff || ''}`.toLowerCase();
  if (text.includes('addis')) {
    return Zone.findOne({ name: 'Addis Ababa Core' }).lean();
  }
  return null;
};

const checkCoverage = async (pickupLat?: number, pickupLng?: number, dropoffLat?: number, dropoffLng?: number) => {
  if (ALLOW_OUT_OF_ZONE) {
    const fallbackZone = await Zone.findOne({ status: 'active' }).sort({ name: 1 }).lean();
    return { ok: true, zone: fallbackZone?.name || null };
  }
  const pickupZone = await getZoneForCoords(pickupLat, pickupLng);
  const dropoffZone = await getZoneForCoords(dropoffLat, dropoffLng);
  if (pickupZone && dropoffZone) {
    if (pickupZone.status !== 'active' || dropoffZone.status !== 'active') {
      return { ok: false, message: pickupZone.message || dropoffZone.message || 'Service coming soon in this zone.' };
    }
    return { ok: true, zone: pickupZone.name };
  }
  return { ok: false, message: 'Service is only available in Addis Ababa zones for now.' };
};

const getPricingRule = async (zoneName: string | null, serviceType: string) => {
  if (!zoneName) return null;
  return PricingRule.findOne({
    active: true,
    zone_name: zoneName,
    $or: [{ service_type: serviceType }, { service_type: null }],
  })
    .sort({ created_at: -1 })
    .lean();
};

const getPromo = async (code: string, userId: string) => {
  if (!code) return null;
  const promo = (await Promo.findOne({ code: code.toUpperCase(), active: true }).lean()) as any;
  if (!promo) return null;
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) return null;
  const totalUses = await PromoRedemption.countDocuments({ promo_id: promo._id });
  if (promo.max_uses && promo.max_uses > 0 && totalUses >= promo.max_uses) return null;
  if (promo.per_user_limit && promo.per_user_limit > 0) {
    const userUses = await PromoRedemption.countDocuments({ promo_id: promo._id, user_id: toObjectId(userId) });
    if (userUses >= promo.per_user_limit) return null;
  }
  return promo;
};

const verifyChapaTransaction = async (txRef: string) => {
  if (!txRef) {
    throw new Error('Missing Chapa transaction reference.');
  }
  if (!CHAPA_SECRET_KEY) {
    return null;
  }

  const response = await fetch(`${CHAPA_API_BASE_URL}/transaction/verify/${encodeURIComponent(txRef)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Unable to verify Chapa transaction.');
  }
  return payload;
};

const getChapaPaymentStatus = (verification: any, fallbackStatus?: string) => {
  const rawStatus = String(verification?.status || verification?.data?.status || fallbackStatus || '').toLowerCase();
  if (rawStatus === 'success' || rawStatus === 'paid' || rawStatus === 'completed') return 'paid';
  if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'canceled') return 'failed';
  return 'pending';
};

  const logAudit = (
    actorId: number | string | null,
    actorRole: string | null,
    action: string,
    entityType?: string,
    entityId?: number | string,
    note?: string,
    meta?: { ip?: string | null; user_agent?: string | null }
  ) => {
    AuditLog.create({
      actor_id: actorId || null,
      actor_role: actorRole || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId ? String(entityId) : null,
      note: note || null,
      ip: meta?.ip || null,
      user_agent: meta?.user_agent || null,
      created_at: new Date(),
    }).catch(() => undefined);
  };

  const getAuditMeta = (req: any) => {
    const forwarded = (req.headers['x-forwarded-for'] || '') as string;
    const ip = forwarded.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    const user_agent = (req.headers['user-agent'] || '').toString() || null;
    return { ip, user_agent };
  };


async function startServer() {
  const app = express();
  app.use(cors({
    origin: 'https://zemenexpress.vercel.app',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  await connectMongo();

  const ensureDefaults = async () => {
    const zoneCount = await Zone.countDocuments();
    if (zoneCount === 0) {
      await Zone.create([
        { name: 'Addis Ababa Core', status: 'active', lat_min: 8.88, lat_max: 9.08, lng_min: 38.68, lng_max: 38.88, message: 'Serving Addis Ababa core zones' },
        { name: 'Addis Ababa Expansion', status: 'coming_soon', lat_min: 8.80, lat_max: 9.15, lng_min: 38.60, lng_max: 39.00, message: 'Coming soon to outer sub-cities' },
      ]);
    }
    const promoCount = await Promo.countDocuments();
    if (promoCount === 0) {
      await Promo.create({
        code: 'ZEMEN20',
        discount_type: 'flat',
        amount: 60,
        min_spend: 200,
        max_uses: 500,
        per_user_limit: 2,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: true,
        created_at: new Date(),
      });
    }
    const pricingCount = await PricingRule.countDocuments();
    if (pricingCount === 0) {
      await PricingRule.create([
        { zone_name: 'Addis Ababa Core', service_type: 'express', base_fare: 90, per_km: 14, weight_rate: 6, surge_multiplier: 1.1, active: true, created_at: new Date() },
        { zone_name: 'Addis Ababa Core', service_type: 'same_day', base_fare: 75, per_km: 12, weight_rate: 5, surge_multiplier: 1, active: true, created_at: new Date() },
      ]);
    }
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.create([
        { name: 'ZED Smartphone X', description: 'Latest model smartphone with advanced features and 5G support.', price: 25000, image_url: 'https://picsum.photos/seed/phone/400/300', stock: 15, created_at: new Date() },
        { name: 'ZED Laptop Pro', description: 'High performance laptop for professionals and creators.', price: 85000, image_url: 'https://picsum.photos/seed/laptop/400/300', stock: 8, created_at: new Date() },
        { name: 'ZED Wireless Earbuds', description: 'Noise cancelling wireless earbuds with long battery life.', price: 4500, image_url: 'https://picsum.photos/seed/earbuds/400/300', stock: 30, created_at: new Date() },
        { name: 'Smart Watch Series 5', description: 'Fitness tracking, heart rate monitor, and notifications.', price: 7000, image_url: 'https://picsum.photos/seed/watch/400/300', stock: 20, created_at: new Date() },
      ]);
    }

    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin1234!';
    const superAdminName = process.env.SUPER_ADMIN_NAME || 'Trinity Stack Admin';
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAIL || 'admin@zemen.local')
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

    const deriveName = (email: string) => {
      const local = email.split('@')[0] || '';
      const cleaned = local.replace(/[._-]+/g, ' ').trim();
      if (!cleaned) return superAdminName;
      return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
    };

    for (const email of superAdminEmails) {
      const existing = await User.findOne({ email }).lean();
      if (existing) continue;
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      await User.create({
        name: superAdminEmails.length > 1 ? deriveName(email) : superAdminName,
        email,
        password: hashedPassword,
        role: 'super_admin',
        phone: '',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    const seedPassword = process.env.SEED_USER_PASSWORD || 'Zed1234!';
    const seedUsers = [
      { name: 'ZED Manager', email: process.env.SEED_MANAGER_EMAIL || 'manager@zed.local', role: 'manager' },
      { name: 'ZED Dispatcher', email: process.env.SEED_DISPATCHER_EMAIL || 'dispatcher@zed.local', role: 'dispatcher' },
      { name: 'ZED Driver', email: process.env.SEED_DRIVER_EMAIL || 'driver@zed.local', role: 'driver' },
      { name: 'ZED Customer', email: process.env.SEED_CUSTOMER_EMAIL || 'customer@zed.local', role: 'customer' },
    ];

    for (const seedUser of seedUsers) {
      const existing = await User.findOne({ email: seedUser.email }).lean();
      if (existing) continue;
      const hashedPassword = await bcrypt.hash(seedPassword, 10);
      const created = await User.create({
        name: seedUser.name,
        email: seedUser.email,
        password: hashedPassword,
        role: seedUser.role,
        phone: '',
        created_at: new Date(),
        updated_at: new Date(),
      });
      await Wallet.create({ user_id: created._id, balance: 0, created_at: new Date(), updated_at: new Date() });
      await Reward.create({ user_id: created._id, points: 0, created_at: new Date(), updated_at: new Date() });
      await NotificationPreference.create({ user_id: created._id, inapp: true, sms: true, email: true });
      if (seedUser.role === 'driver') {
        await Driver.create({ user_id: created._id, phone: '', vehicle_type: 'motorcycle', created_at: new Date(), updated_at: new Date() });
      }
    }
  };

  await ensureDefaults();

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('register', (payload: { userId?: number; role?: string }) => {
      if (payload?.userId) {
        socket.join(`user_${payload.userId}`);
      }
      if (payload?.role === 'admin') {
        socket.join('role_admin');
      }
      if (payload?.role === 'driver') {
        socket.join('role_driver');
      }
    });

    // Join a specific delivery room for chat
    socket.on('join_delivery', (deliveryId) => {
      socket.join(`delivery_${deliveryId}`);
      console.log(`User joined delivery room: delivery_${deliveryId}`);
    });

    // Handle chat messages
    socket.on('send_message', (data) => {
      // Broadcast to everyone in the room
      io.to(`delivery_${data.deliveryId}`).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - started;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  const rateLimits = new Map<string, { count: number; resetAt: number }>();
  const isRateLimited = (key: string, limit: number, windowMs: number) => {
    const now = Date.now();
    const existing = rateLimits.get(key);
    if (!existing || existing.resetAt < now) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    if (existing.count >= limit) return true;
    existing.count += 1;
    return false;
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/zones', (req, res) => {
    try {
      Zone.find().sort({ name: 1 }).lean().then((zones) => res.json(zones));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
      const role = 'customer';

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email' });
      }
      if (phone && !validatePhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      const existingUser = await User.findOne({ email }).lean();
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone: phone || '',
        password_updated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      await Wallet.create({ user_id: user._id, balance: 0, created_at: new Date(), updated_at: new Date() });
      await Reward.create({ user_id: user._id, points: 0, created_at: new Date(), updated_at: new Date() });
      await NotificationPreference.create({ user_id: user._id, inapp: true, sms: true, email: true });

      const token = jwt.sign({ id: String(user._id), role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: String(user._id), name, email, role } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (isRateLimited(`login:${req.ip}:${email}`, 8, 5 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' });
      }
      
      const user = await User.findOne({ email }).lean();
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (user.is_active === false) {
        return res.status(403).json({ error: 'Account is inactive. Contact your administrator.' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      await User.findByIdAndUpdate(user._id, { last_login_at: new Date() });
      const token = jwt.sign({ id: String(user._id), role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Temporary GET probe to debug 404s when browsers hit the login endpoint incorrectly.
  app.get('/api/auth/login', (req, res) => {
    res.send('Login route is working (GET test)');
  });

  app.post('/api/auth/forgot-password/request', async (req, res) => {
    try {
      const email = String(req.body?.email || '').toLowerCase().trim();
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (isRateLimited(`forgot-password:request:${req.ip}:${email}`, 5, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      const user = await User.findOne({ email, is_active: { $ne: false } }).lean();
      if (!user) {
        return res.json({
          success: true,
          message: `If an account exists for ${maskEmail(email)}, an OTP has been sent.`,
        });
      }

      await PasswordReset.updateMany(
        { email, consumed_at: null },
        { consumed_at: new Date() }
      );

      const otp = generateNumericOtp(6);
      const otpHash = hashOtp(email, otp);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MINUTES * 60 * 1000);

      await PasswordReset.create({
        user_id: user._id,
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
        consumed_at: null,
        attempts: 0,
        created_at: new Date(),
      });

      await sendPasswordResetOtpEmail(email, otp).catch((error) => {
        console.error('Password reset email error:', error);
      });

      const response: Record<string, any> = {
        success: true,
        message: `OTP sent to ${maskEmail(email)}.`,
        expiresInMinutes: PASSWORD_RESET_OTP_TTL_MINUTES,
      };
      if (process.env.NODE_ENV !== 'production') {
        response.devOtp = otp;
      }
      res.json(response);
    } catch (error) {
      console.error('Forgot password request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/forgot-password/reset', async (req, res) => {
    try {
      const email = String(req.body?.email || '').toLowerCase().trim();
      const otp = String(req.body?.otp || '').trim();
      const newPassword = String(req.body?.newPassword || '');

      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ error: 'OTP must be 6 digits.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      if (isRateLimited(`forgot-password:verify:${req.ip}:${email}`, 8, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many OTP attempts. Please wait and try again.' });
      }

      const resetRecord = await PasswordReset.findOne({
        email,
        consumed_at: null,
        expires_at: { $gt: new Date() },
      })
        .sort({ created_at: -1 })
        .lean();

      if (!resetRecord) {
        return res.status(400).json({ error: 'OTP expired or invalid. Please request a new code.' });
      }

      const incomingHash = hashOtp(email, otp);
      if (incomingHash !== resetRecord.otp_hash) {
        await PasswordReset.findByIdAndUpdate(resetRecord._id, { $inc: { attempts: 1 } });
        return res.status(400).json({ error: 'Invalid OTP.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(resetRecord.user_id, {
        password: hashedPassword,
        password_updated_at: new Date(),
        updated_at: new Date(),
      });

      await PasswordReset.findByIdAndUpdate(resetRecord._id, {
        consumed_at: new Date(),
      });

      res.json({ success: true, message: 'Password updated successfully. Please sign in.' });
    } catch (error) {
      console.error('Forgot password reset error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => {
    try {
      const user = await User.findById(req.user.id).select('name email role phone').lean();
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Middleware to verify JWT
  async function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      const activeUser = await User.findById(payload.id).select('role is_active').lean();
      if (!activeUser) return res.status(401).json({ error: 'Unauthorized' });
      if (activeUser.is_active === false) {
        return res.status(403).json({ error: 'Account is inactive. Contact your administrator.' });
      }
      req.user = { ...payload, role: activeUser.role };
      next();
    } catch {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const expandRoles = (roles: string[]) => {
    const expanded = new Set<string>();
    for (const role of roles) {
      if (role === 'admin') {
        ADMIN_ROLES.forEach((adminRole) => expanded.add(adminRole));
        SUPER_ADMIN_ROLES.forEach((adminRole) => expanded.add(adminRole));
      } else if (role === 'super_admin') {
        SUPER_ADMIN_ROLES.forEach((adminRole) => expanded.add(adminRole));
      } else {
        expanded.add(role);
      }
    }
    return Array.from(expanded);
  };

  const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    const allowedRoles = expandRoles(roles);
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  const normalizeDoc = (doc: any) => {
    if (!doc) return doc;
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    obj.id = obj._id?.toString();
    return obj;
  };

  const normalizeMany = (docs: any[]) => docs.map(normalizeDoc);

  const emitOrderUpdate = (order: any) => {
    io.to('role_admin').emit('order_updated', order);
    if (order.customer_id) io.to(`user_${order.customer_id}`).emit('order_updated', order);
    if (order.driver_id) io.to(`user_${order.driver_id}`).emit('order_updated', order);
    io.to(`delivery_${order.id}`).emit('order_updated', order);
  };

  const createNotification = async (userId: string, type: string, title: string, body?: string) => {
    const prefs = await NotificationPreference.findOne({ user_id: toObjectId(userId) }).lean();
    if (prefs?.inapp === false) return null;

    const notification = await Notification.create({
      user_id: toObjectId(userId),
      type,
      title,
      body: body || null,
      channel: 'inapp',
      is_read: false,
      created_at: new Date(),
    });
    const normalized = normalizeDoc(notification);
    io.to(`user_${userId}`).emit('notification', normalized);
    return normalized;
  };

  const createRoleNotifications = async (roles: string[], type: string, title: string, body?: string) => {
    const users = await User.find({ role: { $in: roles }, is_active: { $ne: false } }).select('_id').lean();
    await Promise.all(users.map((user) => createNotification(String(user._id), type, title, body)));
  };

  const recordOrderEvent = async (orderId: string, actorRole: string, actorId: string | null, eventType: string, fromStatus?: string, toStatus?: string, note?: string) => {
    await OrderEvent.create({
      order_id: toObjectId(orderId),
      actor_role: actorRole,
      actor_id: actorId ? toObjectId(actorId) : null,
      event_type: eventType,
      from_status: fromStatus || null,
      to_status: toStatus || null,
      note: note || null,
      created_at: new Date(),
    });
  };

  const updateOrderStatus = async (orderId: string, nextStatus: string, actorRole: string, actorId: string | null, note?: string) => {
    const order = await Order.findById(orderId).lean();
    if (!order) throw new Error('Order not found');
    if (order.status === nextStatus) {
      const normalized = normalizeDoc(order);
      emitOrderUpdate(normalized);
      return normalized;
    }
    if (order.status === 'completed' && nextStatus === 'delivered') {
      const normalized = normalizeDoc(order);
      emitOrderUpdate(normalized);
      return normalized;
    }
    if (!STATUS_TRANSITIONS[order.status]?.includes(nextStatus)) {
      throw new Error(`Invalid transition from ${order.status} to ${nextStatus}`);
    }
    await Order.findByIdAndUpdate(orderId, { status: nextStatus, updated_at: new Date() });
    await recordOrderEvent(orderId, actorRole, actorId, 'status_change', order.status, nextStatus, note);
    const updated = await Order.findById(orderId).lean();
    const slaStatus = computeSlaStatus(updated);
    await Order.findByIdAndUpdate(orderId, { sla_status: slaStatus });
    const refreshed = await Order.findById(orderId).lean();
    const normalized = normalizeDoc(refreshed);
    emitOrderUpdate(normalized);
    return normalized;
  };

  const autoDispatch = async (orderId: string) => {
    const order = await Order.findById(orderId).lean();
    if (!order || order.status !== 'confirmed') return;

    const attemptCount = await DispatchOffer.countDocuments({ order_id: toObjectId(orderId) });
    if (attemptCount >= MAX_DISPATCH_ATTEMPTS) {
      await Order.findByIdAndUpdate(orderId, { status: 'failed', updated_at: new Date() });
      await recordOrderEvent(orderId, 'system', null, 'dispatch_failed', order.status, 'failed', 'Max dispatch attempts reached');
      await createNotification(String(order.customer_id), 'dispatch_failed', 'No drivers accepted', 'We will reach out shortly to reschedule.');
      const updated = await Order.findById(orderId).lean();
      emitOrderUpdate(normalizeDoc(updated));
      return;
    }

    const offeredDrivers = (await DispatchOffer.find({ order_id: toObjectId(orderId) }).select('driver_id').lean()).map((row) => String(row.driver_id));
    const blacklistedDrivers = (await DriverBlacklist.find({ customer_id: order.customer_id }).select('driver_id').lean()).map((row) => String(row.driver_id));
    const drivers = await Driver.find({ status: 'approved', is_online: true, break_mode: false }).lean();

    const pickupLat = order.pickup_lat ?? 8.9806;
    const pickupLng = order.pickup_lng ?? 38.7578;
    const sizeRank: Record<string, number> = { small: 1, medium: 2, large: 3, xlarge: 4 };

    const scored = await Promise.all(drivers
      .filter((driver) => !offeredDrivers.includes(String(driver.user_id)))
      .filter((driver) => !blacklistedDrivers.includes(String(driver.user_id)))
      .map(async (driver) => {
        const distance = driver.last_lat && driver.last_lng
          ? haversineKm(pickupLat, pickupLng, driver.last_lat, driver.last_lng)
          : 12;
        const workload = await Order.countDocuments({ driver_id: driver.user_id, status: { $in: ['driver_assigned', 'picked_up', 'in_transit'] } });
        const activeOffers = await DispatchOffer.countDocuments({ driver_id: driver.user_id, status: 'offered' });
        if (activeOffers >= MAX_ACTIVE_OFFERS_PER_DRIVER) return null;
        if (workload >= (driver.max_active_deliveries || 2)) return null;
        if (order.package_weight && driver.max_weight && Number(order.package_weight) > Number(driver.max_weight)) return null;
        if (order.package_size && driver.max_size && sizeRank[order.package_size] > sizeRank[driver.max_size]) return null;
        const score = distance + workload * 2 + (1 - (driver.accept_rate || 1)) * 5;
        const user = await User.findById(driver.user_id).select('name email').lean();
        return { driver: { ...driver, name: user?.name, email: user?.email }, score };
      })
    ).then((items) => items.filter(Boolean).sort((a, b) => a!.score - b!.score).slice(0, 2));

    if (scored.length === 0) {
      await recordOrderEvent(orderId, 'system', null, 'dispatch_failed', order.status, order.status, 'No available drivers');
      io.to('role_admin').emit('dispatch_failed', { orderId });
      return;
    }

    for (const [index, item] of scored.entries()) {
      const expiresAt = new Date(Date.now() + 60000 + index * 5000).toISOString();
      await DispatchOffer.create({
        order_id: toObjectId(orderId),
        driver_id: item.driver.user_id,
        status: 'offered',
        expires_at: new Date(expiresAt),
        attempt: offeredDrivers.length + 1,
        created_at: new Date(),
      });
      await recordOrderEvent(orderId, 'system', null, 'dispatch_offer', order.status, order.status, `Offer sent to ${item.driver.name}`);
      io.to(`user_${item.driver.user_id}`).emit('dispatch_offer', { orderId, expiresAt });
    }
  };

  setInterval(async () => {
    const expiredOffers = await DispatchOffer.find({ status: 'offered', expires_at: { $lt: new Date() } }).lean();
    for (const offer of expiredOffers) {
      await DispatchOffer.findByIdAndUpdate(offer._id, { status: 'expired' });
      await recordOrderEvent(String(offer.order_id), 'system', null, 'dispatch_expired', null, null, 'Offer expired');
      const order = await Order.findById(offer.order_id).lean();
      if (order?.status === 'confirmed') {
        await autoDispatch(String(order._id));
      }
    }
  }, 15000);

  // Orders Routes
  app.get('/api/track/:code', async (req: any, res: any) => {
    try {
      const rawCode = String(req.params.code || '').trim();
      const normalizedCode = rawCode.toUpperCase();
      const digitsOnly = normalizedCode.replace(/[^0-9]/g, '');
      if (!normalizedCode) return res.status(400).json({ error: 'Tracking code required' });
      let order = null;
      if (mongoose.Types.ObjectId.isValid(normalizedCode)) {
        order = await Order.findById(normalizedCode).lean();
      }
      if (!order) {
        order = await Order.findOne({ tracking_code: normalizedCode }).lean();
      }
      if (!order && digitsOnly) {
        order = await Order.findOne({ tracking_code: { $regex: digitsOnly, $options: 'i' } })
          .sort({ created_at: -1 })
          .lean();
      }
      if (!order) return res.status(404).json({ error: 'Order not found' });
      const events = await OrderEvent.find({ order_id: toObjectId(String(order._id)) }).sort({ created_at: 1 }).lean();

      let driverLocation = null as null | { lat: number; lng: number; updated_at?: Date | null };
      let driverProfile = null as null | { name: string; phone: string; vehicle: string };
      if (order?.driver_id) {
        const driverIdRaw = String(order.driver_id);
        if (mongoose.Types.ObjectId.isValid(driverIdRaw)) {
          const driverId = toObjectId(driverIdRaw);
          const latestLocation = await DriverLocation.findOne({ driver_id: driverId }).sort({ updated_at: -1 }).lean();
          if (latestLocation && typeof latestLocation.lat === 'number' && typeof latestLocation.lng === 'number') {
            driverLocation = { lat: latestLocation.lat, lng: latestLocation.lng, updated_at: latestLocation.updated_at || null };
          } else {
            const driver = await Driver.findOne({ user_id: driverId }).lean();
            if (driver && typeof driver.last_lat === 'number' && typeof driver.last_lng === 'number') {
              driverLocation = { lat: driver.last_lat, lng: driver.last_lng, updated_at: driver.last_seen || driver.updated_at || null };
            }
          }
          const driverUser = await User.findById(driverId).select('name phone').lean();
          const driverMeta = await Driver.findOne({ user_id: driverId }).select('vehicle_type').lean();
          if (driverUser) {
            driverProfile = {
              name: driverUser.name || 'Assigned Driver',
              phone: driverUser.phone || '',
              vehicle: driverMeta?.vehicle_type || 'Vehicle',
            };
          }
        }
      }

      res.json({ order: normalizeDoc(order), events: normalizeMany(events), driverLocation, driverProfile });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/orders/quote', authenticateToken, requireRole(['customer']), async (req: any, res: any) => {
    try {
      const { pickup, dropoff, packageSize, packageWeight, serviceType, insurance, promoCode, pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;
      const normalizedPickup = normalizeAddressText(pickup);
      const normalizedDropoff = normalizeAddressText(dropoff);
      const normalizedPromoCode = normalizePromoCode(promoCode);
      if (!normalizedPickup || !normalizedDropoff) return res.status(400).json({ error: 'Pickup and drop-off required.' });
      const zone =
        (await getZoneForCoords(pickupLat, pickupLng)) ||
        (await getZoneForCoords(dropoffLat, dropoffLng)) ||
        (await inferZoneFromAddress(normalizedPickup, normalizedDropoff)) ||
        (ALLOW_OUT_OF_ZONE ? await Zone.findOne({ status: 'active' }).sort({ name: 1 }).lean() : null);
      if (!zone || zone.status !== 'active') {
        return res.status(400).json({ error: zone?.message || 'Service is only available in Addis Ababa zones for now.' });
      }
      const distanceKm = pickupLat && dropoffLat ? await getRouteDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng) : 6;
      const pricingRule = await getPricingRule(zone.name, serviceType);
      const promo = await getPromo(normalizedPromoCode, req.user.id);
      const pricing = calculatePricing({
        distanceKm,
        size: packageSize,
        weight: packageWeight,
        serviceType,
        insurance,
        promoCode: normalizedPromoCode,
      }, pricingRule, promo);
      res.json({ pricing, distanceKm, zone: zone.name });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/orders', authenticateToken, requireRole(['customer']), async (req: any, res: any) => {
    try {
      const {
        pickup,
        dropoff,
        pickupContactName,
        pickupContactPhone,
        dropoffContactName,
        dropoffContactPhone,
        packageType,
        packageSize,
        packageWeight,
        serviceType,
        notes,
        insurance,
        promoCode,
        scheduleType,
        scheduledTime,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        paymentMethod,
        codAmount,
      } = req.body;

      const normalizedPickup = normalizeAddressText(pickup);
      const normalizedDropoff = normalizeAddressText(dropoff);
      const normalizedPromoCode = normalizePromoCode(promoCode);
      const normalizedPaymentMethod = String(paymentMethod || 'cash').toLowerCase();

      if (!normalizedPickup || !normalizedDropoff || !packageSize || !packageWeight || !serviceType) {
        return res.status(400).json({ error: 'Missing required fields.' });
      }
      if (pickupContactPhone && !validatePhone(pickupContactPhone)) {
        return res.status(400).json({ error: 'Invalid pickup phone.' });
      }
      if (dropoffContactPhone && !validatePhone(dropoffContactPhone)) {
        return res.status(400).json({ error: 'Invalid drop-off phone.' });
      }
      if (!VALID_SERVICE_TYPES.includes(serviceType)) {
        return res.status(400).json({ error: 'Invalid service type.' });
      }
      if (!VALID_ORDER_PAYMENT_METHODS.includes(normalizedPaymentMethod as (typeof VALID_ORDER_PAYMENT_METHODS)[number])) {
        return res.status(400).json({ error: 'Invalid payment method. Use cash or chapa.' });
      }
      if (scheduleType === 'scheduled' && !scheduledTime) {
        return res.status(400).json({ error: 'Scheduled time is required.' });
      }

      const coverage = await checkCoverage(pickupLat, pickupLng, dropoffLat, dropoffLng);
      if (!coverage.ok) {
        return res.status(400).json({ error: coverage.message });
      }

      const distanceKm = pickupLat && dropoffLat ? await getRouteDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng) : 6;
      const pricingRule = await getPricingRule(coverage.zone || null, serviceType);
      const promo = await getPromo(normalizedPromoCode, req.user.id);
      const pricing = calculatePricing({
        distanceKm,
        size: packageSize,
        weight: packageWeight,
        serviceType,
        insurance: false,
        promoCode: normalizedPromoCode,
      }, pricingRule, promo);

      if (promo) {
        await PromoRedemption.create({ promo_id: promo._id, user_id: toObjectId(req.user.id), created_at: new Date() });
      }

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const trackingCode = `ZED-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
      const driverAvailability = await Driver.countDocuments({ status: 'approved', is_online: true });
      const eta = computeETA(distanceKm, serviceType, driverAvailability || 0);

      const order = await Order.create({
        customer_id: toObjectId(req.user.id),
        status: 'confirmed',
        service_type: serviceType,
        schedule_type: scheduleType || 'now',
        scheduled_time: scheduledTime || null,
        pickup_address: normalizedPickup,
        pickup_lat: pickupLat || null,
        pickup_lng: pickupLng || null,
        dropoff_address: normalizedDropoff,
        dropoff_lat: dropoffLat || null,
        dropoff_lng: dropoffLng || null,
        pickup_contact_name: pickupContactName || null,
        pickup_contact_phone: pickupContactPhone || null,
        dropoff_contact_name: dropoffContactName || null,
        dropoff_contact_phone: dropoffContactPhone || null,
        package_type: packageType || null,
        package_size: packageSize,
        package_weight: packageWeight,
        notes: notes || null,
        insurance: false,
        promo_code: normalizedPromoCode || null,
        pricing_json: pricing,
        vat: pricing.vat,
        total: pricing.total,
        proof_otp: otp,
        tracking_code: trackingCode,
        payment_method: normalizedPaymentMethod,
        payment_status: 'pending',
        payment_reference: trackingCode,
        payment_checkout_url: null,
        cod_amount: codAmount || 0,
        eta_minutes: eta.etaMinutes,
        eta_text: eta.etaText,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await recordOrderEvent(String(order._id), 'customer', req.user.id, 'order_confirmed', 'draft', 'confirmed', 'Order confirmed');
      await createNotification(req.user.id, 'order_confirmed', 'Order confirmed', `Tracking ${order.tracking_code}`);
      await createRoleNotifications(['dispatcher'], 'order_confirmed', 'New order awaiting dispatch', `Tracking ${order.tracking_code} is ready for assignment.`);
      const normalized = normalizeDoc(order);
      emitOrderUpdate(normalized);
      if (normalizedPaymentMethod !== 'chapa') {
        await autoDispatch(String(order._id));
      }
      res.json(normalized);
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/orders', authenticateToken, requireRole(['customer', 'driver', 'dispatcher', 'admin']), async (req: any, res: any) => {
    try {
      let orders;
      if (req.user.role === 'customer') {
        orders = await Order.find({ customer_id: toObjectId(req.user.id) }).sort({ created_at: -1 }).lean();
      } else if (req.user.role === 'driver') {
        orders = await Order.find({ $or: [{ driver_id: toObjectId(req.user.id) }, { status: 'confirmed' }] }).sort({ created_at: -1 }).lean();
      } else {
        orders = await Order.find().sort({ created_at: -1 }).lean();
      }
      res.json(normalizeMany(orders));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/orders/:id', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const order = await Order.findById(id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (req.user.role === 'customer' && String(order.customer_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (req.user.role === 'driver') {
        const driverDoc = await Driver.findOne({ user_id: toObjectId(req.user.id) }).select('_id user_id').lean();
        const allowedIds = new Set<string>([String(req.user.id)]);
        if (driverDoc?._id) allowedIds.add(String(driverDoc._id));
        if (driverDoc?.user_id) allowedIds.add(String(driverDoc.user_id));
        if (!allowedIds.has(String(order.driver_id))) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
      const events = await OrderEvent.find({ order_id: toObjectId(id) }).sort({ created_at: 1 }).lean();
      res.json({ order: normalizeDoc(order), events: normalizeMany(events) });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/orders/:id/details', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const order = await Order.findById(id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (req.user.role === 'customer' && String(order.customer_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (req.user.role === 'driver' && String(order.driver_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const events = await OrderEvent.find({ order_id: toObjectId(id) }).sort({ created_at: 1 }).lean();
      const driver = order.driver_id ? await Driver.findOne({ user_id: order.driver_id }).lean() : null;
      const driverUser = driver?.user_id ? await User.findById(driver.user_id).select('name email phone').lean() : null;
      const customer = await User.findById(order.customer_id).select('name email phone').lean();
      const tickets = await SupportTicket.find({ order_id: toObjectId(id) }).sort({ created_at: -1 }).lean();
      const ratings = await Rating.find({ order_id: toObjectId(id) }).sort({ created_at: -1 }).lean();
      res.json({
        order: normalizeDoc(order),
        events: normalizeMany(events),
        driver: driver ? { ...driver, name: driverUser?.name, email: driverUser?.email, phone: driverUser?.phone } : null,
        customer: normalizeDoc(customer),
        tickets: normalizeMany(tickets),
        ratings: normalizeMany(ratings),
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/orders/:id/events', authenticateToken, async (req: any, res: any) => {
    try {
      const events = await OrderEvent.find({ order_id: toObjectId(req.params.id) }).sort({ created_at: 1 }).lean();
      res.json(normalizeMany(events));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/orders/:id/event', authenticateToken, requireRole(['driver', 'admin']), async (req: any, res: any) => {
    try {
      const { note, eventType } = req.body;
      const order = await Order.findById(req.params.id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (req.user.role === 'driver' && String(order.driver_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await recordOrderEvent(String(order._id), req.user.role, req.user.id, eventType || 'note', order.status, order.status, note || '');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/orders/:id/issue', authenticateToken, async (req: any, res: any) => {
    try {
      const { category, description } = req.body;
      const order = await Order.findById(req.params.id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status === 'completed') {
        return res.status(400).json({ error: 'Completed deliveries cannot be reported as active issues.' });
      }
      if (req.user.role === 'customer' && String(order.customer_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (req.user.role === 'driver' && String(order.driver_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const ticket = await SupportTicket.create({
        order_id: toObjectId(String(order._id)),
        reporter_role: req.user.role,
        reporter_id: toObjectId(req.user.id),
        category: category || 'issue',
        description: description || '',
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
      });
      await recordOrderEvent(String(order._id), req.user.role, req.user.id, 'issue_reported', order.status, order.status, category || 'issue');
      logAudit(req.user.id, req.user.role, 'ticket_created', 'ticket', Number(ticket._id), category || '');
      await createNotification(String(order.customer_id), 'support_ticket', 'Support ticket created', `Issue reported for order ${order.tracking_code || order.id}.`);
      await createRoleNotifications(['dispatcher'], 'support_ticket', 'Delivery issue reported', `Issue reported for order ${order.tracking_code || order.id}.`);
      io.to('role_admin').emit('ticket_created', { orderId: String(order._id), ticketId: String(ticket._id) });
      res.json({ success: true, ticketId: String(ticket._id) });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/orders/:id/ratings', authenticateToken, async (req: any, res: any) => {
    try {
      const { rating, tags, note, toRole, toId } = req.body;
      const order = await Order.findById(req.params.id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (req.user.role === 'customer' && String(order.customer_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (req.user.role === 'driver' && String(order.driver_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Invalid rating' });
      }
      const existing = await Rating.findOne({ order_id: toObjectId(String(order._id)), from_id: toObjectId(req.user.id) }).lean();
      if (existing) return res.status(400).json({ error: 'Rating already submitted' });

      await Rating.create({
        order_id: toObjectId(String(order._id)),
        from_role: req.user.role,
        to_role: toRole || 'driver',
        from_id: toObjectId(req.user.id),
        to_id: toId ? toObjectId(toId) : null,
        rating,
        tags: tags || [],
        note: note || '',
        created_at: new Date(),
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/orders/:id/cancel', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const order = await Order.findById(id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const allowedForCustomer = ['draft', 'confirmed', 'driver_assigned'];
      if (req.user.role === 'customer') {
        if (String(order.customer_id) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        if (!allowedForCustomer.includes(order.status)) {
          return res.status(400).json({ error: 'Cannot cancel at this stage' });
        }
      }
      if (req.user.role === 'driver') {
        if (String(order.driver_id) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        if (!['driver_assigned'].includes(order.status)) return res.status(400).json({ error: 'Cannot cancel at this stage' });
      }
      let fee = 0;
      if (order.status === 'driver_assigned') fee = 20;
      if (order.status === 'picked_up' || order.status === 'in_transit') fee = 60;
      if (req.user.role !== 'admin' && ['picked_up', 'in_transit'].includes(order.status)) {
        return res.status(400).json({ error: 'Only admin can cancel after pickup.' });
      }
      const refund = order.payment_method === 'cash' ? 0 : Math.max(0, (order.total || 0) - fee);

      await Order.findByIdAndUpdate(id, {
        status: 'cancelled',
        cancellation_reason: reason || 'No reason provided',
        cancellation_fee: fee,
        refund_amount: refund,
        updated_at: new Date(),
      });
      await recordOrderEvent(String(order._id), req.user.role, req.user.id, 'order_cancelled', order.status, 'cancelled', reason);
      if (req.user.role === 'admin') {
        logAudit(req.user.id, req.user.role, 'order_cancelled', 'order', Number(order._id), reason || '');
      }
      await createNotification(String(order.customer_id), 'order_cancelled', 'Order cancelled', `Order ${order.tracking_code || order.id} has been cancelled.`);
      await createRoleNotifications(['dispatcher'], 'order_cancelled', 'Order cancelled', `Order ${order.tracking_code || order.id} has been cancelled.`);
      const updated = await Order.findById(id).lean();
      const normalized = normalizeDoc(updated);
      emitOrderUpdate(normalized);
      res.json(normalized);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/orders/:id/status', authenticateToken, async (req: any, res: any) => {
    try {
      const { status, note, otp } = req.body;
      const { id } = req.params;
      const order = await Order.findById(id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });

      if (req.user.role === 'driver' && String(order.driver_id) !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (status === 'delivered') {
        if (isRateLimited(`otp:${req.user.id}:${order.id}`, 6, 10 * 60 * 1000)) {
          return res.status(429).json({ error: 'Too many OTP attempts. Please wait and try again.' });
        }
        if (!otp || otp !== order.proof_otp) {
          return res.status(400).json({ error: 'Invalid OTP' });
        }
      }

      if (req.user.role === 'driver' && ENFORCE_DRIVER_PROXIMITY) {
        const driver = await Driver.findOne({ user_id: toObjectId(req.user.id) }).select('last_lat last_lng').lean();
        const driverLat = driver?.last_lat;
        const driverLng = driver?.last_lng;
        if (status === 'picked_up' && driverLat && driverLng) {
          const distance = haversineKm(order.pickup_lat || 8.98, order.pickup_lng || 38.75, driverLat, driverLng);
          if (distance > DRIVER_ARRIVAL_RADIUS_KM) {
            return res.status(400).json({ error: 'You must be near pickup location to mark picked up.' });
          }
        }
        if (status === 'delivered' && driverLat && driverLng) {
          const distance = haversineKm(order.dropoff_lat || 8.98, order.dropoff_lng || 38.75, driverLat, driverLng);
          if (distance > DRIVER_ARRIVAL_RADIUS_KM) {
            return res.status(400).json({ error: 'You must be near drop-off location to mark delivered.' });
          }
        }
      }

      const updated = await updateOrderStatus(String(order._id), status, req.user.role, req.user.id, note);
      if (status === 'delivered') {
        await Order.findByIdAndUpdate(order._id, { proof_confirmed_at: new Date() });
        await updateOrderStatus(String(order._id), 'completed', 'system', null, 'Auto completed');
      }
      if (status === 'picked_up') {
        await createNotification(String(order.customer_id), 'picked_up', 'Package picked up', `Order ${order.tracking_code || order.id} is on the way.`);
        await createRoleNotifications(['dispatcher'], 'picked_up', 'Package picked up', `Order ${order.tracking_code || order.id} has been picked up.`);
      }
      if (status === 'in_transit') {
        await createNotification(String(order.customer_id), 'in_transit', 'Driver in transit', `Order ${order.tracking_code || order.id} is in transit.`);
        await createRoleNotifications(['dispatcher'], 'in_transit', 'Driver in transit', `Order ${order.tracking_code || order.id} is in transit.`);
      }
      if (status === 'delivered') {
        await createNotification(String(order.customer_id), 'delivered', 'Delivery completed', `Order ${order.tracking_code || order.id} delivered.`);
        await createRoleNotifications(['dispatcher'], 'delivered', 'Delivery completed', `Order ${order.tracking_code || order.id} has been delivered.`);
      }
      if (status === 'failed') {
        await createNotification(String(order.customer_id), 'delivery_failed', 'Delivery failed', `Order ${order.tracking_code || order.id} failed. Support will reach out.`);
        await createRoleNotifications(['dispatcher'], 'delivery_failed', 'Delivery failed', `Order ${order.tracking_code || order.id} failed and needs follow-up.`);
      }
      if (status === 'returned') {
        await createNotification(String(order.customer_id), 'delivery_returned', 'Delivery returned', `Order ${order.tracking_code || order.id} has been returned.`);
        await createRoleNotifications(['dispatcher'], 'delivery_returned', 'Delivery returned', `Order ${order.tracking_code || order.id} has been returned.`);
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Invalid status update' });
    }
  });

  app.post('/api/orders/:id/assign', authenticateToken, requireRole(['admin', 'dispatcher']), async (req: any, res: any) => {
    try {
      const { driverId } = req.body;
      const order = await Order.findById(req.params.id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (!['confirmed', 'driver_assigned'].includes(order.status)) {
        return res.status(400).json({ error: 'Cannot assign at this stage' });
      }
      const driverIdRaw = String(driverId || '').trim();
      if (!driverIdRaw) return res.status(400).json({ error: 'Driver required' });
      let resolvedDriverId = driverIdRaw;
      const driverById = await Driver.findById(driverIdRaw).select('user_id').lean();
      if (driverById?.user_id) {
        resolvedDriverId = String(driverById.user_id);
      } else if (mongoose.Types.ObjectId.isValid(driverIdRaw)) {
        const driverByUser = await Driver.findOne({ user_id: toObjectId(driverIdRaw) }).select('user_id').lean();
        if (driverByUser?.user_id) {
          resolvedDriverId = String(driverByUser.user_id);
        }
      }
      await Order.findByIdAndUpdate(order._id, { driver_id: toObjectId(resolvedDriverId), status: 'driver_assigned', updated_at: new Date() });
      const distanceKm = order.pickup_lat && order.dropoff_lat ? await getRouteDistanceKm(order.pickup_lat, order.pickup_lng, order.dropoff_lat, order.dropoff_lng) : 6;
      const eta = computeETA(distanceKm, order.service_type, 1);
      await Order.findByIdAndUpdate(order._id, { eta_minutes: eta.etaMinutes, eta_text: eta.etaText });
      await recordOrderEvent(String(order._id), req.user.role, req.user.id, 'driver_assigned', order.status, 'driver_assigned', `Assigned to driver ${driverId}`);
      logAudit(req.user.id, req.user.role, 'driver_assigned', 'order', Number(order._id), `driver ${driverId}`);
      await createNotification(String(order.customer_id), 'driver_assigned', 'Driver assigned', `Driver assigned to order ${order.tracking_code || order.id}.`);
      await createNotification(resolvedDriverId, 'order_assigned', 'New delivery assigned', `Order ${order.tracking_code || order.id} assigned to you.`);
      await createRoleNotifications(['dispatcher'], 'driver_assigned', 'Driver assigned', `Driver assigned to order ${order.tracking_code || order.id}.`);
      const updated = await Order.findById(order._id).lean();
      const normalized = normalizeDoc(updated);
      emitOrderUpdate(normalized);
      res.json(normalized);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Driver offers
  app.get('/api/dispatch/offers', authenticateToken, requireRole(['driver']), async (req: any, res: any) => {
    try {
      const offers = await DispatchOffer.find({ driver_id: toObjectId(req.user.id), status: 'offered' }).sort({ created_at: -1 }).lean();
      res.json(normalizeMany(offers));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/dispatch/offers/:id/accept', authenticateToken, requireRole(['driver']), async (req: any, res: any) => {
    try {
      const offer = await DispatchOffer.findById(req.params.id).lean();
      if (!offer || String(offer.driver_id) !== req.user.id) return res.status(404).json({ error: 'Offer not found' });
      if (offer.status !== 'offered') return res.status(400).json({ error: 'Offer not available' });

      const order = await Order.findById(offer.order_id).lean();
      if (!order || order.status !== 'confirmed') return res.status(400).json({ error: 'Order not available' });

      await DispatchOffer.findByIdAndUpdate(offer._id, { status: 'accepted' });
      await Order.findByIdAndUpdate(order._id, { driver_id: toObjectId(req.user.id), status: 'driver_assigned', updated_at: new Date() });
      const distanceKm = order.pickup_lat && order.dropoff_lat ? await getRouteDistanceKm(order.pickup_lat, order.pickup_lng, order.dropoff_lat, order.dropoff_lng) : 6;
      const eta = computeETA(distanceKm, order.service_type, 1);
      await Order.findByIdAndUpdate(order._id, { eta_minutes: eta.etaMinutes, eta_text: eta.etaText });
      await recordOrderEvent(String(order._id), 'driver', req.user.id, 'offer_accepted', order.status, 'driver_assigned', 'Driver accepted offer');
      const updated = await Order.findById(order._id).lean();
      await createNotification(String(order.customer_id), 'driver_assigned', 'Driver assigned', `Driver is on the way for order ${order.tracking_code || order.id}`);
      await createNotification(req.user.id, 'order_assigned', 'New delivery assigned', `Order ${order.tracking_code || order.id} assigned to you.`);
      await createRoleNotifications(['dispatcher'], 'driver_assigned', 'Driver assigned', `Driver accepted order ${order.tracking_code || order.id}.`);
      const normalized = normalizeDoc(updated);
      emitOrderUpdate(normalized);
      res.json(normalized);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/dispatch/offers/:id/decline', authenticateToken, requireRole(['driver']), async (req: any, res: any) => {
    try {
      const offer = await DispatchOffer.findById(req.params.id).lean();
      if (!offer || String(offer.driver_id) !== req.user.id) return res.status(404).json({ error: 'Offer not found' });
      await DispatchOffer.findByIdAndUpdate(offer._id, { status: 'declined' });
      await recordOrderEvent(String(offer.order_id), 'driver', req.user.id, 'offer_declined', null, null, 'Driver declined offer');
      await autoDispatch(String(offer.order_id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Driver availability and location
  app.put('/api/drivers/me/availability', authenticateToken, requireRole(['driver']), async (req: any, res: any) => {
    try {
      const { isOnline } = req.body;
      await Driver.findOneAndUpdate({ user_id: toObjectId(req.user.id) }, { is_online: !!isOnline, last_seen: new Date(), updated_at: new Date() });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/drivers/me/location', authenticateToken, requireRole(['driver']), async (req: any, res: any) => {
    try {
      const { lat, lng } = req.body;
      await Driver.findOneAndUpdate({ user_id: toObjectId(req.user.id) }, { last_lat: lat, last_lng: lng, last_seen: new Date(), updated_at: new Date() });
      await DriverLocation.findOneAndUpdate(
        { driver_id: toObjectId(req.user.id) },
        { driver_id: toObjectId(req.user.id), lat, lng, updated_at: new Date() },
        { upsert: true, returnDocument: 'after' }
      );
      io.to('role_admin').emit('driver_location', { driverId: req.user.id, lat, lng });

      const activeOrder = await Order.findOne({ driver_id: toObjectId(req.user.id), status: { $in: ['driver_assigned', 'picked_up', 'in_transit'] } }).sort({ updated_at: -1 }).lean();
      if (activeOrder && lat && lng) {
        io.to(`delivery_${activeOrder._id}`).emit('driver_location', { orderId: String(activeOrder._id), driverId: req.user.id, lat, lng });
        if (activeOrder.customer_id) {
          io.to(`user_${activeOrder.customer_id}`).emit('driver_location', { orderId: String(activeOrder._id), driverId: req.user.id, lat, lng });
        }
        if (activeOrder.status === 'driver_assigned' && activeOrder.pickup_lat && activeOrder.pickup_lng) {
          const distance = haversineKm(activeOrder.pickup_lat, activeOrder.pickup_lng, lat, lng);
          if (distance <= DRIVER_ARRIVAL_RADIUS_KM) {
            const existing = await OrderEvent.findOne({ order_id: toObjectId(String(activeOrder._id)), event_type: 'arrived_pickup' }).lean();
            if (!existing) {
              await recordOrderEvent(String(activeOrder._id), 'system', req.user.id, 'arrived_pickup', activeOrder.status, activeOrder.status, 'Driver arrived at pickup');
              await createNotification(String(activeOrder.customer_id), 'driver_arriving', 'Driver arrived', `Driver reached pickup for order ${activeOrder.tracking_code || activeOrder._id}.`);
            }
          }
        }
        if (activeOrder.status === 'in_transit' && activeOrder.dropoff_lat && activeOrder.dropoff_lng) {
          const distance = haversineKm(activeOrder.dropoff_lat, activeOrder.dropoff_lng, lat, lng);
          if (distance <= DRIVER_ARRIVAL_RADIUS_KM) {
            const existing = await OrderEvent.findOne({ order_id: toObjectId(String(activeOrder._id)), event_type: 'arrived_dropoff' }).lean();
            if (!existing) {
              await recordOrderEvent(String(activeOrder._id), 'system', req.user.id, 'arrived_dropoff', activeOrder.status, activeOrder.status, 'Driver arrived at drop-off');
              await createNotification(String(activeOrder.customer_id), 'driver_arriving', 'Driver arriving', `Driver is arriving at drop-off for order ${activeOrder.tracking_code || activeOrder._id}.`);
            }
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Addresses
  app.get('/api/addresses', authenticateToken, async (req: any, res: any) => {
    try {
      const addresses = await Address.find({ user_id: toObjectId(req.user.id) }).sort({ is_default: -1, created_at: -1 }).lean();
      res.json(normalizeMany(addresses));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/addresses', authenticateToken, async (req: any, res: any) => {
    try {
      const { label, address, isDefault } = req.body;
      if (!label || !address) return res.status(400).json({ error: 'Label and address required' });
      if (isDefault) {
        await Address.updateMany({ user_id: toObjectId(req.user.id) }, { is_default: false });
      }
      const newAddress = await Address.create({
        user_id: toObjectId(req.user.id),
        label,
        address,
        is_default: !!isDefault,
        created_at: new Date(),
        updated_at: new Date(),
      });
      res.json(normalizeDoc(newAddress));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/addresses/:id', authenticateToken, async (req: any, res: any) => {
    try {
      const { label, address } = req.body;
      const updated = await Address.findOneAndUpdate(
        { _id: req.params.id, user_id: toObjectId(req.user.id) },
        { label, address, updated_at: new Date() },
        { returnDocument: 'after' }
      );
      res.json(normalizeDoc(updated));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/addresses/:id', authenticateToken, async (req: any, res: any) => {
    try {
      await Address.deleteOne({ _id: req.params.id, user_id: toObjectId(req.user.id) });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/addresses/:id/default', authenticateToken, async (req: any, res: any) => {
    try {
      await Address.updateMany({ user_id: toObjectId(req.user.id) }, { is_default: false });
      await Address.findOneAndUpdate({ _id: req.params.id, user_id: toObjectId(req.user.id) }, { is_default: true, updated_at: new Date() });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Wallet & Rewards
  app.get('/api/wallet', authenticateToken, async (req: any, res: any) => {
    try {
      const wallet = await Wallet.findOne({ user_id: toObjectId(req.user.id) }).lean();
      const tx = await WalletTransaction.find({ user_id: toObjectId(req.user.id) }).sort({ created_at: -1 }).limit(10).lean();
      res.json({ wallet: wallet || { balance: 0 }, transactions: normalizeMany(tx) });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/rewards', authenticateToken, async (req: any, res: any) => {
    try {
      const rewards = await Reward.findOne({ user_id: toObjectId(req.user.id) }).lean();
      const tx = await RewardTransaction.find({ user_id: toObjectId(req.user.id) }).sort({ created_at: -1 }).limit(10).lean();
      res.json({ rewards: rewards || { points: 0 }, transactions: normalizeMany(tx) });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/wallet/topup', authenticateToken, async (req: any, res: any) => {
    try {
      const { amount, method } = req.body;
      if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });
      await Wallet.findOneAndUpdate({ user_id: toObjectId(req.user.id) }, { $inc: { balance: Number(amount) }, updated_at: new Date() }, { upsert: true });
      await WalletTransaction.create({ user_id: toObjectId(req.user.id), type: 'credit', amount: Number(amount), reference: method || 'topup', created_at: new Date() });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Notifications
  app.get('/api/notifications', authenticateToken, async (req: any, res: any) => {
    try {
      const notifications = await Notification.find({ user_id: toObjectId(req.user.id) }).sort({ created_at: -1 }).limit(20).lean();
      const normalized = normalizeMany(notifications);
      res.json(dedupeNotifications(normalized));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/notifications/read', authenticateToken, async (req: any, res: any) => {
    try {
      const { ids } = req.body;
      if (Array.isArray(ids) && ids.length > 0) {
        await Notification.updateMany({ _id: { $in: ids }, user_id: toObjectId(req.user.id) }, { is_read: true });
      } else {
        await Notification.updateMany({ user_id: toObjectId(req.user.id) }, { is_read: true });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/notifications/preferences', authenticateToken, async (req: any, res: any) => {
    try {
      const pref = await NotificationPreference.findOne({ user_id: toObjectId(req.user.id) }).lean();
      res.json(pref || { inapp: true, sms: true, email: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/notifications/preferences', authenticateToken, async (req: any, res: any) => {
    try {
      const { inapp, sms, email } = req.body;
      await NotificationPreference.findOneAndUpdate(
        { user_id: toObjectId(req.user.id) },
        { inapp: !!inapp, sms: !!sms, email: !!email },
        { upsert: true, returnDocument: 'after' }
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin reports
  app.get('/api/admin/reports', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const total = await Order.countDocuments();
      const completed = await Order.countDocuments({ status: 'completed' });
      const cancelled = await Order.countDocuments({ status: 'cancelled' });
      const revenueAgg = await Order.aggregate([{ $match: { status: { $in: ['delivered', 'completed'] } } }, { $group: { _id: null, sum: { $sum: '$total' } } }]);
      const atRisk = await Order.countDocuments({ sla_status: 'at_risk' });
      const late = await Order.countDocuments({ sla_status: 'late' });
      res.json({
        totalOrders: total,
        completedOrders: completed,
        cancellations: cancelled,
        revenue: revenueAgg?.[0]?.sum || 0,
        atRisk: atRisk || 0,
        late: late || 0,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Deliveries Routes
  app.post('/api/deliveries', authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== 'customer') {
        return res.status(403).json({ error: 'Only customers can create deliveries' });
      }

      const { pickupLocation, dropLocation, parcelDescription, parcelWeight, receiverPhone, price, deliveryType, scheduledTime, paymentMethod, productId, serviceType, hasInsurance } = req.body;
      
      const delivery = await Delivery.create({
        customer_id: toObjectId(req.user.id),
        pickup_location: pickupLocation || 'ZED Store',
        drop_location: dropLocation,
        parcel_description: parcelDescription,
        parcel_weight: parcelWeight || 0,
        receiver_phone: receiverPhone,
        price,
        delivery_type: deliveryType || 'standard',
        scheduled_time: scheduledTime || null,
        payment_method: paymentMethod || 'cod',
        product_id: productId ? toObjectId(productId) : null,
        payment_status: paymentMethod === 'chapa' ? 'paid' : 'pending',
        service_type: serviceType || 'same_day',
        has_insurance: !!hasInsurance,
        created_at: new Date(),
        updated_at: new Date(),
      });
      res.json(normalizeDoc(delivery));
    } catch (error) {
      console.error('Create delivery error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/deliveries', authenticateToken, async (req: any, res: any) => {
    try {
      let deliveries;
      if (req.user.role === 'customer') {
        deliveries = await Delivery.find({ customer_id: toObjectId(req.user.id) }).sort({ created_at: -1 }).lean();
      } else if (req.user.role === 'driver') {
        // Drivers see their assigned deliveries and pending ones
        deliveries = await Delivery.find({ $or: [{ driver_id: toObjectId(req.user.id) }, { delivery_status: 'pending' }] }).sort({ created_at: -1 }).lean();
      } else if (req.user.role === 'admin') {
        deliveries = await Delivery.find().sort({ created_at: -1 }).lean();
      }
      res.json(normalizeMany(deliveries || []));
    } catch (error) {
      console.error('Get deliveries error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/deliveries/:id/status', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (req.user.role !== 'driver' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to update status' });
      }

      const delivery = await Delivery.findById(id).lean();
      if (!delivery) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      if (req.user.role === 'driver') {
        if (delivery.driver_id && String(delivery.driver_id) !== req.user.id) {
          return res.status(403).json({ error: 'Delivery assigned to another driver' });
        }
        
        // If accepting a pending delivery
        if (status === 'accepted' && delivery.delivery_status === 'pending') {
          await Delivery.findByIdAndUpdate(id, { delivery_status: status, driver_id: toObjectId(req.user.id), updated_at: new Date() });
        } else {
          await Delivery.findByIdAndUpdate(id, { delivery_status: status, updated_at: new Date() });
        }
      } else {
        // Admin can update anything
        await Delivery.findByIdAndUpdate(id, { delivery_status: status, updated_at: new Date() });
      }

      const updated = await Delivery.findById(id).lean();
      res.json(normalizeDoc(updated));
    } catch (error) {
      console.error('Update delivery error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Routes
  app.get('/api/users', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const users = await User.find().select('name email role phone is_active created_at updated_at password_updated_at last_login_at').lean();
      res.json(normalizeMany(users));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/users', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const { name, email, password, role, phone, vehicleType } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email' });
      }
      if (phone && !validatePhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      const roleMatrix: Record<string, string[]> = {
        super_admin: ['admin', 'manager', 'dispatcher', 'driver', 'customer'],
        admin: ['dispatcher', 'driver'],
        manager: ['dispatcher', 'driver'],
      };
      const allowedRoles = roleMatrix[req.user.role] || [];
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'Unauthorized to create this role' });
      }

      const existing = await User.findOne({ email }).lean();
      if (existing) return res.status(400).json({ error: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone: phone || '',
        is_active: true,
        password_updated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      if (role === 'driver') {
        await Driver.create({
          user_id: user._id,
          phone: phone || '',
          vehicle_type: vehicleType || 'motorcycle',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      if (role === 'customer') {
        await Wallet.create({ user_id: user._id, balance: 0, created_at: new Date(), updated_at: new Date() });
        await Reward.create({ user_id: user._id, points: 0, created_at: new Date(), updated_at: new Date() });
        await NotificationPreference.create({ user_id: user._id, inapp: true, sms: true, email: true });
      }

      logAudit(req.user.id, req.user.role, 'user_created', 'user', Number(user._id), role, getAuditMeta(req));
      res.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/admin/users/:id/active', authenticateToken, requireRole(['super_admin']), async (req: any, res: any) => {
    try {
      const { active } = req.body;
      const { id } = req.params;
      await User.findByIdAndUpdate(id, { is_active: !!active, updated_at: new Date() });
      logAudit(req.user.id, req.user.role, 'user_status_update', 'user', Number(id), !!active ? 'active' : 'inactive', getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/users/:id', authenticateToken, requireRole(['super_admin']), async (req: any, res: any) => {
    try {
      const user = await User.findById(req.params.id)
        .select('name email role phone is_active created_at updated_at password_updated_at last_login_at password')
        .lean();
      if (!user) return res.status(404).json({ error: 'User not found' });
      const normalized = normalizeDoc(user);
      normalized.password_hash = user.password || null;
      delete normalized.password;
      res.json(normalized);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/admin/users/:id/password', authenticateToken, requireRole(['super_admin']), async (req: any, res: any) => {
    try {
      const { password } = req.body;
      if (!password || String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      const hashedPassword = await bcrypt.hash(String(password), 10);
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { password: hashedPassword, password_updated_at: new Date(), updated_at: new Date() },
        { new: true }
      ).select('password');
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const verified = await bcrypt.compare(String(password), updatedUser.password);
      if (!verified) {
        return res.status(500).json({ error: 'Password update verification failed.' });
      }
      logAudit(req.user.id, req.user.role, 'user_password_reset', 'user', Number(req.params.id), 'reset', getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/admin/audit/:id/review', authenticateToken, requireRole(['super_admin']), async (req: any, res: any) => {
    try {
      const { status, note } = req.body;
      const nextStatus = status || 'reviewed';
      await AuditLog.findByIdAndUpdate(req.params.id, {
        review_status: nextStatus,
        review_note: note || null,
        reviewed_by: toObjectId(req.user.id),
        reviewed_at: new Date(),
      });
      logAudit(req.user.id, req.user.role, 'audit_reviewed', 'audit', Number(req.params.id), nextStatus, getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/drivers', authenticateToken, requireRole(['admin', 'dispatcher']), async (req: any, res: any) => {
    try {
      const drivers = await Driver.find().lean();
      const users = await User.find({ _id: { $in: drivers.map((d) => d.user_id) } }).select('name email phone').lean();
      const userMap = new Map(users.map((u) => [String(u._id), u]));
      res.json(drivers.map((driver) => ({
        ...driver,
        id: String(driver._id),
        name: userMap.get(String(driver.user_id))?.name,
        email: userMap.get(String(driver.user_id))?.email,
        phone: userMap.get(String(driver.user_id))?.phone,
      })));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/drivers/:id/status', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await Driver.findByIdAndUpdate(id, { status, updated_at: new Date() });
      logAudit(req.user.id, req.user.role, 'driver_status_update', 'driver', Number(id), status, getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin support tickets
  app.get('/api/admin/tickets', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const tickets = await SupportTicket.find().sort({ created_at: -1 }).lean();
      const orderIds = tickets.map((t) => t.order_id);
      const reporterIds = tickets.map((t) => t.reporter_id).filter(Boolean);
      const orders = await Order.find({ _id: { $in: orderIds } }).select('tracking_code status').lean();
      const users = await User.find({ _id: { $in: reporterIds } }).select('name').lean();
      const orderMap = new Map(orders.map((o) => [String(o._id), o]));
      const userMap = new Map(users.map((u) => [String(u._id), u]));
      res.json(tickets.map((t) => ({
        ...t,
        id: String(t._id),
        tracking_code: orderMap.get(String(t.order_id))?.tracking_code,
        order_status: orderMap.get(String(t.order_id))?.status,
        reporter_name: userMap.get(String(t.reporter_id))?.name,
      })));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/admin/tickets/:id/status', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const { status, note } = req.body;
      await SupportTicket.findByIdAndUpdate(req.params.id, { status, updated_at: new Date() });
      logAudit(req.user.id, req.user.role, 'ticket_status_update', 'ticket', Number(req.params.id), note || status, getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin zones
  app.get('/api/admin/zones', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const zones = await Zone.find().sort({ name: 1 }).lean();
      res.json(normalizeMany(zones));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/zones', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const { name, status, latMin, latMax, lngMin, lngMax, message } = req.body;
      if (!name) return res.status(400).json({ error: 'Zone name required' });
      const zone = await Zone.create({ name, status: status || 'active', lat_min: latMin || null, lat_max: latMax || null, lng_min: lngMin || null, lng_max: lngMax || null, message: message || null });
      logAudit(req.user.id, req.user.role, 'zone_created', 'zone', Number(zone._id), name, getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/admin/zones/:id', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const { status, message } = req.body;
      await Zone.findByIdAndUpdate(req.params.id, { status, message: message || null });
      logAudit(req.user.id, req.user.role, 'zone_updated', 'zone', Number(req.params.id), status, getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin promos and pricing
  app.get('/api/admin/promos', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const promos = await Promo.find().sort({ created_at: -1 }).lean();
      res.json(normalizeMany(promos));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/promos', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const { code, discountType, amount, minSpend, maxUses, perUserLimit, expiresAt, active } = req.body;
      const promo = await Promo.create({
        code: code.toUpperCase(),
        discount_type: discountType,
        amount,
        min_spend: minSpend || 0,
        max_uses: maxUses || 0,
        per_user_limit: perUserLimit || 0,
        expires_at: expiresAt || null,
        active: !!active,
        created_at: new Date(),
      });
      logAudit(req.user.id, req.user.role, 'promo_created', 'promo', Number(promo._id), code, getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/admin/promos/:id', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const { active } = req.body;
      await Promo.findByIdAndUpdate(req.params.id, { active: !!active });
      logAudit(req.user.id, req.user.role, 'promo_updated', 'promo', Number(req.params.id), active ? 'active' : 'inactive', getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/pricing', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const rules = await PricingRule.find().sort({ created_at: -1 }).lean();
      res.json(normalizeMany(rules));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/pricing', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const { zoneName, serviceType, baseFare, perKm, weightRate, surgeMultiplier } = req.body;
      const rule = await PricingRule.create({
        zone_name: zoneName || null,
        service_type: serviceType || null,
        base_fare: baseFare,
        per_km: perKm,
        weight_rate: weightRate,
        surge_multiplier: surgeMultiplier || 1,
        active: true,
        created_at: new Date(),
      });
      logAudit(req.user.id, req.user.role, 'pricing_rule_created', 'pricing_rule', Number(rule._id), zoneName || '', getAuditMeta(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin search + audit
  app.get('/api/admin/search', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const query = (req.query.q as string || '').toLowerCase();
      const orders = await Order.find({
        $or: [
          { tracking_code: { $regex: query, $options: 'i' } },
          { pickup_address: { $regex: query, $options: 'i' } },
          { dropoff_address: { $regex: query, $options: 'i' } },
        ],
      }).lean();
      const users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
        ],
      }).select('name email phone role').lean();
      res.json({ orders: normalizeMany(orders), users: normalizeMany(users) });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/audit', authenticateToken, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const logs = await AuditLog.find().sort({ created_at: -1 }).limit(50).lean();
      res.json(normalizeMany(logs));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/drivers/me', authenticateToken, requireRole(['driver']), async (req: any, res: any) => {
    try {
      const driver = await Driver.findOne({ user_id: toObjectId(req.user.id) }).lean();
      const user = await User.findById(req.user.id).select('name email').lean();
      res.json(driver ? { ...driver, id: String(driver._id), name: user?.name, email: user?.email } : null);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/drivers/me', authenticateToken, requireRole(['driver']), async (req: any, res: any) => {
    try {
      const { breakMode, maxActiveDeliveries, maxWeight, maxSize, vehicleType, shiftStart, shiftEnd, idDoc, licenseDoc } = req.body;
      await Driver.findOneAndUpdate(
        { user_id: toObjectId(req.user.id) },
        {
          break_mode: !!breakMode,
          max_active_deliveries: maxActiveDeliveries || 2,
          max_weight: maxWeight || 25,
          max_size: maxSize || 'large',
          vehicle_type: vehicleType || null,
          shift_start: shiftStart || null,
          shift_end: shiftEnd || null,
          id_doc: idDoc || null,
          license_doc: licenseDoc || null,
          updated_at: new Date(),
        }
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/drivers/apply', authenticateToken, requireRole(['driver']), async (req: any, res: any) => {
    try {
      const { phone, vehicleType, idDoc, licenseDoc } = req.body;
      await Driver.findOneAndUpdate(
        { user_id: toObjectId(req.user.id) },
        {
          phone,
          vehicle_type: vehicleType,
          id_doc: idDoc || null,
          license_doc: licenseDoc || null,
          status: 'pending',
          verification_status: 'pending',
          updated_at: new Date(),
        },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Products Routes
  app.get('/api/products', async (req: any, res: any) => {
    try {
      const products = await Product.find().lean();
      res.json(normalizeMany(products));
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.all('/api/payments/chapa/callback', async (req: any, res: any) => {
    try {
      const txRef = String(req.body?.tx_ref || req.body?.trx_ref || req.query?.tx_ref || req.query?.trx_ref || '').trim();
      const callbackStatus = String(req.body?.status || req.query?.status || '').toLowerCase();
      if (!txRef) {
        return res.status(400).json({ error: 'Missing Chapa transaction reference.' });
      }

      const order = await Order.findOne({ payment_reference: txRef }).lean();
      if (!order) {
        return res.status(404).json({ error: 'Order not found for this payment reference.' });
      }

      let verification: any = null;
      if (CHAPA_SECRET_KEY) {
        verification = await verifyChapaTransaction(txRef);
      }

      const paymentStatus = getChapaPaymentStatus(verification, callbackStatus);
      const paymentAlreadySettled = String(order.payment_status || '').toLowerCase() === 'paid';

      if (!paymentAlreadySettled) {
        await Order.findByIdAndUpdate(order._id, {
          payment_status: paymentStatus,
          payment_verified_at: paymentStatus === 'paid' ? new Date() : null,
          payment_checkout_url: verification?.data?.checkout_url || order.payment_checkout_url || null,
          updated_at: new Date(),
        });
      }

      const refreshed = await Order.findById(order._id).lean();
      if (paymentStatus === 'paid' && !paymentAlreadySettled) {
        await createNotification(String(order.customer_id), 'payment_success', 'Payment confirmed', `Payment received for order ${order.tracking_code || order.id}.`);
        if (order.status === 'confirmed') {
          await autoDispatch(String(order._id));
        }
      } else if (paymentStatus === 'failed') {
        await createNotification(String(order.customer_id), 'payment_failed', 'Payment failed', `Payment could not be completed for order ${order.tracking_code || order.id}.`);
      }

      if (refreshed) {
        emitOrderUpdate(normalizeDoc(refreshed));
      }

      const returnUrl = String(req.body?.return_url || req.query?.return_url || `${APP_BASE_URL}/orders/${order._id}`);
      if ((req.headers.accept || '').includes('text/html')) {
        return res.redirect(returnUrl);
      }

      return res.json({
        success: true,
        tx_ref: txRef,
        status: paymentStatus,
        order: refreshed ? normalizeDoc(refreshed) : null,
      });
    } catch (error) {
      console.error('Chapa callback error:', error);
      res.status(500).json({ error: 'Failed to process Chapa callback.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, '../frontend/vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, '../dist')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
