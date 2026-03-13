import mongoose from 'mongoose';

const DriverLocationSchema = new mongoose.Schema(
  {
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    lat: Number,
    lng: Number,
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'driver_locations' }
);

export default mongoose.models.DriverLocation || mongoose.model('DriverLocation', DriverLocationSchema);
