import mongoose from 'mongoose';

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

export default mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
