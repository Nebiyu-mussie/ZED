import mongoose from 'mongoose';

// Core identities
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, required: true, index: true },
    phone: { type: String },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'users' }
);

const DriverSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    phone: String,
    vehicle_type: String,
    status: { type: String, default: 'pending' },
    is_online: { type: Boolean, default: false },
    last_lat: Number,
    last_lng: Number,
    accept_rate: { type: Number, default: 1 },
    cancel_rate: { type: Number, default: 0 },
    completed_deliveries: { type: Number, default: 0 },
    last_seen: Date,
    max_active_deliveries: { type: Number, default: 2 },
    max_weight: { type: Number, default: 25 },
    max_size: { type: String, default: 'large' },
    break_mode: { type: Boolean, default: false },
    shift_start: Date,
    shift_end: Date,
    verification_status: { type: String, default: 'pending' },
    id_doc: String,
    license_doc: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'drivers' }
);

const DriverBlacklistSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    reason: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'driver_blacklist' }
);

DriverBlacklistSchema.index({ customer_id: 1, driver_id: 1 }, { unique: true });

const DriverLocationSchema = new mongoose.Schema(
  {
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    lat: Number,
    lng: Number,
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'driver_locations' }
);

// Orders + deliveries
const OrderSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, index: true },
    service_type: String,
    schedule_type: { type: String, default: 'now' },
    scheduled_time: Date,
    tracking_code: { type: String, index: true },
    pickup_address: String,
    pickup_lat: Number,
    pickup_lng: Number,
    dropoff_address: String,
    dropoff_lat: Number,
    dropoff_lng: Number,
    pickup_contact_name: String,
    pickup_contact_phone: String,
    dropoff_contact_name: String,
    dropoff_contact_phone: String,
    package_type: String,
    package_size: String,
    package_weight: Number,
    notes: String,
    insurance: { type: Boolean, default: false },
    promo_code: String,
    pricing_json: mongoose.Schema.Types.Mixed,
    vat: Number,
    total: Number,
    payment_method: { type: String, default: 'cash' },
    cod_amount: { type: Number, default: 0 },
    eta_minutes: Number,
    eta_text: String,
    sla_status: { type: String, default: 'on_track' },
    proof_method: { type: String, default: 'otp' },
    proof_otp: String,
    proof_confirmed_at: Date,
    cancellation_reason: String,
    cancellation_fee: { type: Number, default: 0 },
    refund_amount: { type: Number, default: 0 },
    failure_reason: String,
    return_reason: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'orders' }
);

const OrderEventSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    actor_role: String,
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    event_type: String,
    from_status: String,
    to_status: String,
    note: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'order_events' }
);

const DeliverySchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pickup_location: String,
    drop_location: String,
    parcel_description: String,
    parcel_weight: Number,
    receiver_phone: String,
    price: Number,
    delivery_status: { type: String, default: 'pending' },
    delivery_type: { type: String, default: 'standard' },
    service_type: { type: String, default: 'same_day' },
    has_insurance: { type: Boolean, default: false },
    scheduled_time: Date,
    payment_method: { type: String, default: 'cod' },
    payment_status: { type: String, default: 'pending' },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'deliveries' }
);

const AddressSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    label: String,
    address: String,
    lat: Number,
    lng: Number,
    is_default: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'addresses' }
);

const DispatchOfferSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, required: true },
    expires_at: { type: Date, required: true },
    attempt: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'dispatch_offers' }
);

// Financials + rewards
const WalletSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    balance: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'wallets' }
);

const WalletTransactionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    reference: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'wallet_transactions' }
);

const RewardSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    points: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'rewards' }
);

const RewardTransactionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, required: true },
    points: { type: Number, required: true },
    description: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'reward_transactions' }
);

// Support + notifications
const SupportTicketSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    reporter_role: String,
    reporter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: String,
    description: String,
    status: { type: String, default: 'open' },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'support_tickets' }
);

const RatingSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    from_role: String,
    to_role: String,
    from_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    tags: mongoose.Schema.Types.Mixed,
    note: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'ratings' }
);

const NotificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: String,
    title: String,
    body: String,
    channel: { type: String, default: 'inapp' },
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'notifications' }
);

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    inapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },
  { collection: 'notification_preferences' }
);

// Ops + pricing
const ZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, default: 'active' },
    lat_min: Number,
    lat_max: Number,
    lng_min: Number,
    lng_max: Number,
    message: String,
  },
  { collection: 'zones' }
);

const PricingRuleSchema = new mongoose.Schema(
  {
    zone_name: String,
    service_type: String,
    base_fare: Number,
    per_km: Number,
    weight_rate: Number,
    surge_multiplier: { type: Number, default: 1 },
    active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'pricing_rules' }
);

const PromoSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    discount_type: { type: String, required: true },
    amount: { type: Number, required: true },
    min_spend: { type: Number, default: 0 },
    max_uses: { type: Number, default: 0 },
    per_user_limit: { type: Number, default: 0 },
    expires_at: Date,
    active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'promos' }
);

const PromoRedemptionSchema = new mongoose.Schema(
  {
    promo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Promo', index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'promo_redemptions' }
);

// Admin + catalog
const AuditLogSchema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actor_role: String,
    action: String,
    entity_type: String,
    entity_id: String,
    note: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'audit_logs' }
);

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    image_url: String,
    stock: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'products' }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
export const DriverBlacklist = mongoose.models.DriverBlacklist || mongoose.model('DriverBlacklist', DriverBlacklistSchema);
export const DriverLocation = mongoose.models.DriverLocation || mongoose.model('DriverLocation', DriverLocationSchema);

export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const OrderEvent = mongoose.models.OrderEvent || mongoose.model('OrderEvent', OrderEventSchema);
export const Delivery = mongoose.models.Delivery || mongoose.model('Delivery', DeliverySchema);
export const Address = mongoose.models.Address || mongoose.model('Address', AddressSchema);
export const DispatchOffer = mongoose.models.DispatchOffer || mongoose.model('DispatchOffer', DispatchOfferSchema);

export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
export const WalletTransaction = mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', WalletTransactionSchema);
export const Reward = mongoose.models.Reward || mongoose.model('Reward', RewardSchema);
export const RewardTransaction = mongoose.models.RewardTransaction || mongoose.model('RewardTransaction', RewardTransactionSchema);

export const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);
export const Rating = mongoose.models.Rating || mongoose.model('Rating', RatingSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const NotificationPreference =
  mongoose.models.NotificationPreference || mongoose.model('NotificationPreference', NotificationPreferenceSchema);

export const Zone = mongoose.models.Zone || mongoose.model('Zone', ZoneSchema);
export const PricingRule = mongoose.models.PricingRule || mongoose.model('PricingRule', PricingRuleSchema);
export const Promo = mongoose.models.Promo || mongoose.model('Promo', PromoSchema);
export const PromoRedemption = mongoose.models.PromoRedemption || mongoose.model('PromoRedemption', PromoRedemptionSchema);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
