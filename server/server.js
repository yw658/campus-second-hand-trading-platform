const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const orderRoutes = require('./routes/orders');
const favoriteRoutes = require('./routes/favorites');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploads');
const convoRoutes = require('./routes/convos');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json({ limit: '2mb' }));
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/convos', convoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (_req, res) => res.send('Backend working!'));

app.use((req, res) => res.status(404).json({ message: 'Not found', path: req.originalUrl }));
app.use((err, _req, res, _next) => {
    console.error('[Error]', err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

const port = process.env.PORT || 5002;
let server;

async function start() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is missing in .env');
        await mongoose.connect(uri);
        console.log('MongoDB Connected.');
        server = app.listen(port, () => console.log('Server running on', port));
        mongoose.connection.on('error', (e) => console.error('[MongoDB error]', e?.message || e));
        mongoose.connection.on('disconnected', () => console.warn('[MongoDB] disconnected'));
    } catch (err) {
        console.error('Startup Error:', err.message);
        process.exit(1);
    }
}
start();

async function shutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down...`);
    try {
        if (server) await new Promise((r, j) => server.close((e) => (e ? j(e) : r())));
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (e) {
        console.error('Error during shutdown:', e);
        process.exit(1);
    }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));