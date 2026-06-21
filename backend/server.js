const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

connectDB();

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/routes',   require('./routes/routes'));
app.use('/api/optimize', require('./routes/optimize'));
app.use('/api/extract',  require('./routes/extract'));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

app.get('/', (req, res) => {
  res.json({ message: 'Route Optimizer API is running', status: 'OK' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});