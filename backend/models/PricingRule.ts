import mongoose from 'mongoose';

const PricingRuleSchema = new mongoose.Schema(
  {
    zone_name: String,
    service_type: String,
    base_fare: Number,
    per_km: Number,
    weight_rate: Number,
    surge_multiplier: { type: Number, default: 1 },
    active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'pricing_rules' }
);

export default mongoose.models.PricingRule || mongoose.model('PricingRule', PricingRuleSchema);
