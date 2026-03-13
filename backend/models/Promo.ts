import mongoose from 'mongoose';

const PromoSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    discount_type: { type: String, required: true },
    amount: { type: Number, required: true },
    min_spend: { type: Number, default: 0 },
    max_uses: { type: Number, default: 0 },
    per_user_limit: { type: Number, default: 0 },
    expires_at: Date,
    active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'promos' }
);

export default mongoose.models.Promo || mongoose.model('Promo', PromoSchema);
