import mongoose from 'mongoose';

const RewardSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    points: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'rewards' }
);

export default mongoose.models.Reward || mongoose.model('Reward', RewardSchema);
