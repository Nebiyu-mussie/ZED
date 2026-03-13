import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, required: true, index: true },
    phone: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'users' }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
