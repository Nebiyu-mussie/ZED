import mongoose from 'mongoose';

const RatingSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    from_role: String,
    to_role: String,
    from_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    tags: mongoose.Schema.Types.Mixed,
    note: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'ratings' }
);

export default mongoose.models.Rating || mongoose.model('Rating', RatingSchema);
