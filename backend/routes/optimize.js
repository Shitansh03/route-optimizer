const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Route = require('../models/Route');
const { optimizeRoute } = require('../services/routeOptimizer');


router.post('/', auth, async (req, res) => {
  try {
    const { routeId } = req.body;
    if (!routeId) return res.status(400).json({ msg: 'routeId is required.' });

    const route = await Route.findOne({ _id: routeId, userId: req.user.userId });
    if (!route) return res.status(404).json({ msg: 'Route not found.' });

    if (!route.startLocation || !route.startLocation.lat) {
      return res.status(400).json({ msg: 'Start location not set. Please set your hub/start location first.' });
    }

    if (route.stops.length === 0) {
      return res.status(400).json({ msg: 'No stops added yet.' });
    }

    console.log(`Optimizing route with ${route.stops.length} stops...`);

    const result = await optimizeRoute(route.startLocation, route.stops.toObject());


    route.optimizedOrder = result.optimizedOrder;
    route.totalDistance = result.totalDistance;
    route.estimatedTime = result.estimatedTime;
    route.routeGeometry = result.routeGeometry;

    result.optimizedOrder.forEach((stopOriginalIdx, position) => {
      route.stops[stopOriginalIdx].sequence = position + 1;
    });

    await route.save();

    res.json({ success: true, route });

  } catch (err) {
    console.error('Optimize error:', err);
    res.status(500).json({ msg: err.message || 'Optimization failed.' });
  }
});

module.exports = router;