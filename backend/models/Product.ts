import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    image_url: String,
    stock: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'products' }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
