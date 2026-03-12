import mongoose from 'mongoose';

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

export default mongoose.models.DriverBlacklist || mongoose.model('DriverBlacklist', DriverBlacklistSchema);
