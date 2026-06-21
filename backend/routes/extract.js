const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const fs      = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const auth    = require('../middleware/auth');
const { processScreenRecording } = require('../services/videoProcessor');
const { cleanAddressesWithAI, ruleBasedExtract } = require('../services/aiCleaner');
const { geocodeBatch, geocodeAddress, autocompleteAddress, resolveMapplsEloc } = require('../services/geocoder');

const upload = multer({
  dest: './temp/uploads/',
  limits: { fileSize: 500 * 1024 * 1024 },
});

router.post('/text', auth, async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ msg: 'rawText is required.' });
    }

    let addresses = await cleanAddressesWithAI(rawText);

    if (!addresses || addresses.length === 0) {
      console.log('AI returned 0 — using rule-based fallback');
      addresses = ruleBasedExtract(rawText);
    }

    if (!addresses || addresses.length === 0) {
      addresses = rawText.split('\n')
        .map(l => l.trim()).filter(l => l.length > 8).slice(0, 30)
        .map(line => ({ raw: line, cleaned: line, confidence: 'low', issues: 'Auto-extract uncertain — please review' }));
    }

    res.json({ addresses, count: addresses.length });
  } catch (err) {
    console.error('Text extract error:', err);
    res.status(500).json({ msg: 'AI extraction failed.' });
  }
});


router.get('/autocomplete', auth, async (req, res) => {
  try {
    const { q, lat, lng } = req.query;
    if (!q || q.length < 2) return res.json({ suggestions: [] });
    const suggestions = await autocompleteAddress(q, lat, lng);
    res.json({ suggestions });
  } catch (err) {
    console.error('Autocomplete error:', err);
    res.json({ suggestions: [] });
  }
});


router.post('/resolve-eloc', auth, async (req, res) => {
  try {
    const { eloc } = req.body;
    if (!eloc) return res.status(400).json({ msg: 'eloc is required.' });
    const result = await resolveMapplsEloc(eloc);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ msg: 'eLoc resolve failed.' });
  }
});


router.post('/geocode-single', auth, async (req, res) => {
  try {
    const { address, biasLat, biasLng } = req.body;
    if (!address) return res.status(400).json({ msg: 'address is required.' });
    const result = await geocodeAddress(address, biasLat, biasLng);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ msg: 'Geocoding failed.' });
  }
});


router.post('/geocode-batch', auth, async (req, res) => {
  try {
    const { addresses } = req.body;
    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({ msg: 'addresses array is required.' });
    }
    const results = await geocodeBatch(addresses);
    res.json({ results, count: results.length });
  } catch (err) {
    res.status(500).json({ msg: 'Batch geocoding failed.' });
  }
});


router.post('/recording', auth, upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'No video file uploaded.' });

  const sessionId = uuidv4();
  const io        = req.app.get('io');
  const emit      = (event, data) => io.emit(`processing:${sessionId}`, { event, ...data });

  res.json({ sessionId, message: 'Processing started.' });

  try {
    const result = await processScreenRecording(req.file.path, sessionId, emit);
    io.emit(`processing:${sessionId}`, { event: 'complete', result });
  } catch (err) {
    io.emit(`processing:${sessionId}`, { event: 'error', message: err.message || 'Processing failed.' });
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
});

module.exports = router;