import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: String,
    title: String,
    body: String,
    channel: { type: String, default: 'inapp' },
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'notifications' }
);

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
