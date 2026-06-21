const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Route = require('../models/Route');


router.post('/create', auth, async (req, res) => {
  try {
    const { date, startLocation } = req.body;

    const route = new Route({
      userId: req.user.userId,
      date: date || new Date().toISOString().split('T')[0],
      startLocation: startLocation || {},
      stops: [],
      status: 'draft'
    });

    await route.save();
    res.status(201).json(route);

  } catch (err) {
    console.error('Create route error:', err);
    res.status(500).json({ msg: 'Failed to create route.' });
  }
});


router.get('/my-routes', auth, async (req, res) => {
  try {
    const routes = await Route.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(routes);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch routes.' });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!route) return res.status(404).json({ msg: 'Route not found.' });
    res.json(route);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch route.' });
  }
});


router.post('/:id/stops', auth, async (req, res) => {
  try {
    const { stops } = req.body;
    if (!stops || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({ msg: 'stops array is required.' });
    }

    const route = await Route.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!route) return res.status(404).json({ msg: 'Route not found.' });

    for (const stop of stops) {
      if (!stop.address || stop.lat === undefined || stop.lng === undefined) {
        return res.status(400).json({ msg: 'Each stop needs address, lat, lng.' });
      }
    }

    route.stops.push(...stops);
    await route.save();

    res.json(route);

  } catch (err) {
    console.error('Add stops error:', err);
    res.status(500).json({ msg: 'Failed to add stops.' });
  }
});


router.put('/:routeId/stops/:stopId', auth, async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'delivered', 'failed', 'reattempt'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value.' });
    }

    const route = await Route.findOne({ _id: req.params.routeId, userId: req.user.userId });
    if (!route) return res.status(404).json({ msg: 'Route not found.' });

    const stop = route.stops.id(req.params.stopId);
    if (!stop) return res.status(404).json({ msg: 'Stop not found.' });

    stop.status = status;
    stop.note = note || '';
    stop.attemptedAt = new Date();

    await route.save();
    res.json({ success: true, stop });

  } catch (err) {
    res.status(500).json({ msg: 'Failed to update stop.' });
  }
});


router.put('/:id/start-location', auth, async (req, res) => {
  try {
    const { startLocation } = req.body;

    const route = await Route.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!route) return res.status(404).json({ msg: 'Route not found.' });

    route.startLocation = startLocation;
    await route.save();

    res.json(route);

  } catch (err) {
    res.status(500).json({ msg: 'Failed to update start location.' });
  }
});


router.put('/:id/start', auth, async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!route) return res.status(404).json({ msg: 'Route not found.' });

    route.status = 'active';
    route.startedAt = new Date();
    await route.save();

    res.json(route);

  } catch (err) {
    res.status(500).json({ msg: 'Failed to start route.' });
  }
});


router.put('/:id/complete', auth, async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!route) return res.status(404).json({ msg: 'Route not found.' });

    route.status = 'completed';
    route.completedAt = new Date();

    if (route.startedAt) {
      const totalMins = Math.round((new Date() - new Date(route.startedAt)) / 60000);
      route.actualTime = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
    }

    await route.save();
    res.json(route);

  } catch (err) {
    res.status(500).json({ msg: 'Failed to complete route.' });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!route) return res.status(404).json({ msg: 'Route not found.' });
    res.json({ success: true, msg: 'Route deleted.' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to delete route.' });
  }
});

module.exports = router;