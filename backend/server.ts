import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'zemen-express-secret-key';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

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

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role, phone, vehicleType } = req.body;
      
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const insertUser = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
      const result = insertUser.run(name, email, hashedPassword, role);
      const userId = result.lastInsertRowid;

      if (role === 'driver') {
        const insertDriver = db.prepare('INSERT INTO drivers (user_id, phone, vehicle_type) VALUES (?, ?, ?)');
        insertDriver.run(userId, phone || '', vehicleType || '');
      }

      const token = jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: userId, name, email, role } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Middleware to verify JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  // Deliveries Routes
  app.post('/api/deliveries', authenticateToken, (req: any, res: any) => {
    try {
      if (req.user.role !== 'customer') {
        return res.status(403).json({ error: 'Only customers can create deliveries' });
      }

      const { pickupLocation, dropLocation, parcelDescription, parcelWeight, receiverPhone, price, deliveryType, scheduledTime, paymentMethod, productId, serviceType, hasInsurance } = req.body;
      
      const insert = db.prepare(`
        INSERT INTO deliveries (customer_id, pickup_location, drop_location, parcel_description, parcel_weight, receiver_phone, price, delivery_type, scheduled_time, payment_method, product_id, payment_status, service_type, has_insurance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insert.run(
        req.user.id, 
        pickupLocation || 'ZED Store', 
        dropLocation, 
        parcelDescription, 
        parcelWeight || 0, 
        receiverPhone, 
        price, 
        deliveryType || 'standard', 
        scheduledTime || null, 
        paymentMethod || 'cod', 
        productId || null,
        paymentMethod === 'chapa' ? 'paid' : 'pending',
        serviceType || 'same_day',
        hasInsurance ? 1 : 0
      );
      
      const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(result.lastInsertRowid);
      res.json(delivery);
    } catch (error) {
      console.error('Create delivery error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/deliveries', authenticateToken, (req: any, res: any) => {
    try {
      let deliveries;
      if (req.user.role === 'customer') {
        deliveries = db.prepare('SELECT * FROM deliveries WHERE customer_id = ? ORDER BY created_at DESC').all(req.user.id);
      } else if (req.user.role === 'driver') {
        // Drivers see their assigned deliveries and pending ones
        deliveries = db.prepare('SELECT * FROM deliveries WHERE driver_id = ? OR delivery_status = "pending" ORDER BY created_at DESC').all(req.user.id);
      } else if (req.user.role === 'admin') {
        deliveries = db.prepare('SELECT * FROM deliveries ORDER BY created_at DESC').all();
      }
      res.json(deliveries);
    } catch (error) {
      console.error('Get deliveries error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/deliveries/:id/status', authenticateToken, (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (req.user.role !== 'driver' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to update status' });
      }

      const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id) as any;
      if (!delivery) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      if (req.user.role === 'driver') {
        if (delivery.driver_id && delivery.driver_id !== req.user.id) {
          return res.status(403).json({ error: 'Delivery assigned to another driver' });
        }
        
        // If accepting a pending delivery
        if (status === 'accepted' && delivery.delivery_status === 'pending') {
          db.prepare('UPDATE deliveries SET delivery_status = ?, driver_id = ? WHERE id = ?').run(status, req.user.id, id);
        } else {
          db.prepare('UPDATE deliveries SET delivery_status = ? WHERE id = ?').run(status, id);
        }
      } else {
        // Admin can update anything
        db.prepare('UPDATE deliveries SET delivery_status = ? WHERE id = ?').run(status, id);
      }

      const updated = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id);
      res.json(updated);
    } catch (error) {
      console.error('Update delivery error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Routes
  app.get('/api/users', authenticateToken, (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
      const users = db.prepare('SELECT id, name, email, role FROM users').all();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/drivers', authenticateToken, (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
      const drivers = db.prepare(`
        SELECT d.*, u.name, u.email 
        FROM drivers d 
        JOIN users u ON d.user_id = u.id
      `).all();
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/drivers/:id/status', authenticateToken, (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
      const { id } = req.params;
      const { status } = req.body;
      db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run(status, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Products Routes
  app.get('/api/products', (req: any, res: any) => {
    try {
      const products = db.prepare('SELECT * FROM products').all();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Mock Chapa Payment Route
  app.post('/api/payments/chapa', authenticateToken, (req: any, res: any) => {
    try {
      const { amount, email, name } = req.body;
      // In a real app, this would call Chapa's API to initialize payment
      // For this prototype, we simulate a successful payment delay
      setTimeout(() => {
        res.json({ success: true, message: 'Payment processed successfully via Chapa', transactionId: 'CHAPA-' + Math.random().toString(36).substring(7).toUpperCase() });
      }, 1500);
    } catch (error) {
      res.status(500).json({ error: 'Payment processing failed' });
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
