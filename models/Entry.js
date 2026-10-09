import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema(
  {
    // 'sale' = token sold to a customer, 'purchase' = stock bought from a supplier
    type: { type: String, enum: ['sale', 'purchase'], required: true },
    date: { type: Date, required: true },
    token: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 }, // price per token (₹)
    party: { type: String, trim: true, default: '' }, // customer or supplier name
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Always keep amount = quantity × rate, never trust the client for it
entrySchema.pre('validate', function (next) {
  this.amount = Math.round(Number(this.quantity) * Number(this.rate) * 100) / 100;
  next();
});

export default mongoose.model('Entry', entrySchema);
