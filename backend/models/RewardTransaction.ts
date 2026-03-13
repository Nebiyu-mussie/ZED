import mongoose from 'mongoose';

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

export default mongoose.models.RewardTransaction || mongoose.model('RewardTransaction', RewardTransactionSchema);
