import mongoose from 'mongoose';

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

export default mongoose.models.Delivery || mongoose.model('Delivery', DeliverySchema);
