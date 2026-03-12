import mongoose from 'mongoose';

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    inapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },
  { collection: 'notification_preferences' }
);

export default mongoose.models.NotificationPreference || mongoose.model('NotificationPreference', NotificationPreferenceSchema);
