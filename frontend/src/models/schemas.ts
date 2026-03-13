import mongoose, { Schema, Document } from 'mongoose';

// 1. Users Collection
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'driver' | 'admin';
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
}

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'driver', 'admin'], default: 'customer' },
  phone: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

// 2. Drivers Collection
export interface IDriver extends Document {
  userId: mongoose.Types.ObjectId;
  licenseNumber: string;
  licenseImage: string;
  vehicle: {
    type: 'motorcycle' | 'car' | 'van' | 'truck';
    make: string;
    model: string;
    plateNumber: string;
    color: string;
    photos: string[];
  };
  idDocument: string;
  backgroundCheckConsent: boolean;
  trainingAgreement: boolean;
  isAvailable: boolean;
  currentLocation: {
    type: string;
    coordinates: number[];
  };
  ratings: {
    average: number;
    count: number;
  };
  earnings: {
    total: number;
    pending: number;
  };
}

const DriverSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  licenseNumber: { type: String, required: true },
  licenseImage: { type: String },
  vehicle: {
    type: { type: String, enum: ['motorcycle', 'car', 'van', 'truck'], required: true },
    make: { type: String },
    model: { type: String },
    plateNumber: { type: String, required: true },
    color: { type: String },
    photos: [{ type: String }],
  },
  idDocument: { type: String },
  backgroundCheckConsent: { type: Boolean, default: false },
  trainingAgreement: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: false },
  currentLocation: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  earnings: {
    total: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
  },
});

DriverSchema.index({ currentLocation: '2dsphere' });

// 3. Products Collection (ZED Store)
export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  vendorId: mongoose.Types.ObjectId;
  isActive: boolean;
}

const ProductSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  images: [{ type: String }],
  stock: { type: Number, default: 0 },
  vendorId: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
});

// 4. Orders Collection
export interface IOrder extends Document {
  customerId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  type: 'delivery' | 'store';
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  pickupLocation: {
    address: string;
    coordinates: number[];
  };
  dropoffLocation: {
    address: string;
    coordinates: number[];
  };
  parcelDetails?: {
    size: 'small' | 'medium' | 'large' | 'xlarge';
    weight: number;
    type: string;
  };
  storeItems?: Array<{
    productId: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
  }>;
  pricing: {
    baseFare: number;
    distanceFare: number;
    weightSurcharge: number;
    insurance: number;
    expressFee: number;
    discount: number;
    tax: number;
    total: number;
  };
  schedule: {
    type: 'now' | 'later' | 'same_day';
    requestedTime?: Date;
  };
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'card' | 'wallet';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
  type: { type: String, enum: ['delivery', 'store'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'], default: 'pending' },
  pickupLocation: {
    address: { type: String, required: true },
    coordinates: { type: [Number], required: true },
  },
  dropoffLocation: {
    address: { type: String, required: true },
    coordinates: { type: [Number], required: true },
  },
  parcelDetails: {
    size: { type: String, enum: ['small', 'medium', 'large', 'xlarge'] },
    weight: { type: Number },
    type: { type: String },
  },
  storeItems: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number },
    price: { type: Number },
  }],
  pricing: {
    baseFare: { type: Number, default: 0 },
    distanceFare: { type: Number, default: 0 },
    weightSurcharge: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    expressFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  schedule: {
    type: { type: String, enum: ['now', 'later', 'same_day'], default: 'now' },
    requestedTime: { type: Date },
  },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'card', 'wallet'], default: 'cash' },
}, { timestamps: true });

// 5. Transactions Collection
const TransactionSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['payment', 'payout', 'refund'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  reference: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// 6. Notifications Collection
const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['order_update', 'promo', 'system'], required: true },
  isRead: { type: Boolean, default: false },
  data: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

// 7. Reviews and Ratings Collection
const ReviewSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  revieweeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// 8. Locations and Addresses Collection
const AddressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  label: { type: String, required: true }, // e.g., 'Home', 'Work'
  address: { type: String, required: true },
  coordinates: { type: [Number], required: true },
  instructions: { type: String },
  isDefault: { type: Boolean, default: false },
});

// 9. Delivery Zones Collection
const DeliveryZoneSchema = new Schema({
  name: { type: String, required: true }, // e.g., 'Bole', 'Piassa'
  polygon: {
    type: { type: String, default: 'Polygon' },
    coordinates: [[[Number]]],
  },
  baseMultiplier: { type: Number, default: 1.0 },
  isActive: { type: Boolean, default: true },
});
DeliveryZoneSchema.index({ polygon: '2dsphere' });

// 10. Parcel Types and Pricing Matrix
const PricingMatrixSchema = new Schema({
  baseFare: { type: Number, required: true },
  perKmRate: { type: Number, required: true },
  sizeMultipliers: {
    small: { type: Number, default: 1.0 },
    medium: { type: Number, default: 1.5 },
    large: { type: Number, default: 2.0 },
    xlarge: { type: Number, default: 3.0 },
  },
  weightMultiplierPerKg: { type: Number, required: true },
  expressFeeMultiplier: { type: Number, default: 1.5 },
  insuranceRate: { type: Number, default: 0.01 }, // 1% of declared value
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Driver = mongoose.models.Driver || mongoose.model<IDriver>('Driver', DriverSchema);
export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
export const Address = mongoose.models.Address || mongoose.model('Address', AddressSchema);
export const DeliveryZone = mongoose.models.DeliveryZone || mongoose.model('DeliveryZone', DeliveryZoneSchema);
export const PricingMatrix = mongoose.models.PricingMatrix || mongoose.model('PricingMatrix', PricingMatrixSchema);
