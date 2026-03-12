import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    balance: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'wallets' }
);

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
