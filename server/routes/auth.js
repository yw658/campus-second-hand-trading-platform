const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ message: 'Username already exists' });

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, passwordHash });
        await newUser.save();

        res.status(201).json({ message: 'User successfully registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign(
            { _id: user._id.toString(), email: user.email, username: user.username, isAdmin: !!user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES || '7d' }
        );

        res.status(200).json({
            message: 'User successfully logged in',
            token,
            user: { _id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;