const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, city, hub } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ msg: 'Name, phone, and password are required.' });
    }
    if (phone.length < 10) {
      return res.status(400).json({ msg: 'Enter a valid phone number.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters.' });
    }


    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ msg: 'This phone number is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      phone: phone.trim(),
      password: hashedPassword,
      city: city ? city.trim() : '',
      hub: hub ? hub.trim() : ''
    });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        city: user.city,
        hub: user.hub
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ msg: 'Server error during registration.' });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ msg: 'Phone and password are required.' });
    }


    const user = await User.findOne({ phone: phone.trim() });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid phone or password.' });
    }


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid phone or password.' });
    }


    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        city: user.city,
        hub: user.hub
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error during login.' });
  }
});


const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error.' });
  }
});

module.exports = router;