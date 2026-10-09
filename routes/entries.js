import { Router } from 'express';
import mongoose from 'mongoose';
import Entry from '../models/Entry.js';

const router = Router();

const pick = (body) => ({
  type: body.type,
  date: body.date,
  token: body.token,
  quantity: body.quantity,
  rate: body.rate,
  party: body.party,
});

// GET /api/entries?type=sale|purchase  -> list entries, newest first
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (['sale', 'purchase'].includes(req.query.type)) filter.type = req.query.type;
    const entries = await Entry.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// GET /api/entries/summary -> totals for the four cards
router.get('/summary', async (req, res, next) => {
  try {
    const rows = await Entry.aggregate([
      { $group: { _id: '$type', amount: { $sum: '$amount' }, qty: { $sum: '$quantity' } } },
    ]);
    const get = (t) => rows.find((r) => r._id === t) || { amount: 0, qty: 0 };
    const sale = get('sale');
    const purchase = get('purchase');
    res.json({
      totalSales: sale.amount,
      tokensSold: sale.qty,
      stockCost: purchase.amount,
      tokensBought: purchase.qty,
      profit: sale.amount - purchase.amount,
      tokensInStock: purchase.qty - sale.qty,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/entries -> create
router.post('/', async (req, res, next) => {
  try {
    const entry = await Entry.create(pick(req.body));
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// PUT /api/entries/:id -> update
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Entry not found' });
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    Object.entries(pick(req.body)).forEach(([k, v]) => v !== undefined && entry.set(k, v));
    await entry.save();
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/entries/:id -> delete
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Entry not found' });
    const entry = await Entry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
