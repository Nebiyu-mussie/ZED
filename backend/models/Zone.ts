import mongoose from 'mongoose';

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

export default mongoose.models.Zone || mongoose.model('Zone', ZoneSchema);
