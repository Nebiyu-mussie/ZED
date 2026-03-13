import mongoose from 'mongoose';

const DispatchOfferSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, required: true },
    expires_at: { type: Date, required: true },
    attempt: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'dispatch_offers' }
);

export default mongoose.models.DispatchOffer || mongoose.model('DispatchOffer', DispatchOfferSchema);
