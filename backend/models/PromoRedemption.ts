import mongoose from 'mongoose';

const PromoRedemptionSchema = new mongoose.Schema(
  {
    promo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Promo', index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'promo_redemptions' }
);

export default mongoose.models.PromoRedemption || mongoose.model('PromoRedemption', PromoRedemptionSchema);
