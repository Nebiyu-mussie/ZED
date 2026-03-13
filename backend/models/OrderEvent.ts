import mongoose from 'mongoose';

const OrderEventSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    actor_role: String,
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    event_type: String,
    from_status: String,
    to_status: String,
    note: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'order_events' }
);

export default mongoose.models.OrderEvent || mongoose.model('OrderEvent', OrderEventSchema);
