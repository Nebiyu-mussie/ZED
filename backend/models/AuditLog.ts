import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actor_role: String,
    action: String,
    entity_type: String,
    entity_id: String,
    note: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'audit_logs' }
);

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
