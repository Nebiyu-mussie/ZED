import 'dotenv/config';
import mongoose from '../lib/mongo.js';
import { connectMongo } from '../lib/mongo.js';
import {
  Address,
  AuditLog,
  Delivery,
  DispatchOffer,
  Driver,
  DriverBlacklist,
  DriverLocation,
  Notification,
  NotificationPreference,
  Order,
  OrderEvent,
  PricingRule,
  Product,
  Promo,
  PromoRedemption,
  Rating,
  Reward,
  RewardTransaction,
  SupportTicket,
  User,
  Wallet,
  WalletTransaction,
  Zone,
} from '../models/index.js';

const models = [
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
];

const ensureDefaults = async () => {
  const zoneCount = await Zone.countDocuments();
  if (zoneCount === 0) {
    await Zone.create([
      { name: 'Addis Ababa Core', status: 'active', lat_min: 8.88, lat_max: 9.08, lng_min: 38.68, lng_max: 38.88, message: 'Serving Addis Ababa core zones' },
      { name: 'Addis Ababa Expansion', status: 'coming_soon', lat_min: 8.8, lat_max: 9.15, lng_min: 38.6, lng_max: 39, message: 'Coming soon to outer sub-cities' },
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
};

const run = async () => {
  await connectMongo();

  for (const model of models) {
    await model.createCollection();
    await model.syncIndexes();
  }

  await ensureDefaults();
  await mongoose.connection.close();
};

run()
  .then(() => {
    console.log('Collections initialized.');
  })
  .catch((err) => {
    console.error('Init failed:', err);
    mongoose.connection.close().catch(() => undefined);
    process.exitCode = 1;
  });
