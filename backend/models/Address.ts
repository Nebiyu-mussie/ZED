import mongoose from 'mongoose';

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

export default mongoose.models.Address || mongoose.model('Address', AddressSchema);
