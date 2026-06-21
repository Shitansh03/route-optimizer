const mongoose = require('mongoose');

const StopSchema = new mongoose.Schema({
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  parcelId: { type: String, default: '' },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'reattempt'],
    default: 'pending'
  },
  sequence: { type: Number, default: 0 },
  note: { type: String, default: '' },
  attemptedAt: { type: Date, default: null }
});

const RouteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft'
  },
  startLocation: {
    address: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  stops: [StopSchema],
  optimizedOrder: { type: [Number], default: [] },
  routeGeometry: { type: Object, default: null },
  totalDistance: { type: String, default: '' },
  estimatedTime: { type: String, default: '' },
  actualTime: { type: String, default: '' },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('Route', RouteSchema);