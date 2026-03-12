import mongoose from 'mongoose';

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

export default mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', WalletTransactionSchema);
