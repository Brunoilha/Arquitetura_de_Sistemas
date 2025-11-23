import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  products: [
    {
      productId: { type: Number, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: false }
    }
  ],
  totalValue: { type: Number, required: false, default: 0 },
  paymentMethod: { type: String, required: false },
  status: { type: String, enum: ['pending', 'completed', 'canceled'], default: 'pending' }
}, { timestamps: true });

export const Order = mongoose.model('Order', OrderSchema);
