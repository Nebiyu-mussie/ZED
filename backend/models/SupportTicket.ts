import mongoose from 'mongoose';

const SupportTicketSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    reporter_role: String,
    reporter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: String,
    description: String,
    status: { type: String, default: 'open' },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'support_tickets' }
);

export default mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);
