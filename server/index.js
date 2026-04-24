require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import Models
const User = require('./models/User');
const Anomaly = require('./models/Anomaly');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS for the Next.js Frontend
const io = new Server(server, {
  cors: {
    origin: '*', // For dev, you can restrict this to http://localhost:3000 later
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[*] Connected to MongoDB.'))
  .catch(err => {
    console.error('[!] MongoDB Connection Error:', err.message);
    console.warn('Note: Start the server without Mongo working if you just want to test ML endpoints initially.');
  });

// --- AUTHENTICATION ROUTES (Signup/Login) ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists.' });

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save User
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    // Create JWT
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, userId: newUser._id, email: newUser.email });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find User
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials.' });

    // Validate Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials.' });

    // Create JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, userId: user._id, email: user.email });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// --- HISTORICAL DATA ROUTES ---
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    // Fetch most recent anomalies
    const anomalies = await Anomaly.find()
      .sort({ timestamp: -1 })
      .limit(limit);
    res.status(200).json(anomalies);
  } catch (error) {
    console.error('Error fetching historical anomalies:', error);
    res.status(500).json({ error: 'Failed to fetch historical data.' });
  }
});

// --- ML & SOCKET.IO PIPELINE LOOP ---

let isAttackSimulated = false;

// We use Socket.IO to let the frontend trigger our "attack" dataset simulation flag
io.on('connection', (socket) => {
  console.log(`[+] Frontend client connected: ${socket.id}`);

  socket.on('simulate_attack', () => {
    console.log('[!] Frontend instructed to start attack simulation.');
    isAttackSimulated = true;
    
    setTimeout(() => {
      console.log('[*] Attack simulation complete. Returning to baseline.');
      isAttackSimulated = false;
    }, 8000);
  });

  socket.on('disconnect', () => {
    console.log(`[-] Frontend client disconnected: ${socket.id}`);
  });
});

// Buffer to hold live incoming packets from the Python Sniffer
let livePacketBuffer = [];

// Endpoint for sniffer.py to POST real packets to the Node.js Gateway
app.post('/api/ingest', (req, res) => {
  const packets = req.body.packets;
  if (packets && Array.isArray(packets)) {
    livePacketBuffer.push(...packets);
  }
  res.status(200).send({ status: 'ok', buffered: livePacketBuffer.length });
});

// Create an http Agent that is reused for all requests to prevent MaxListenersExceededWarning
const axiosInstance = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
});

// Background Loop: Run every 2 seconds
setInterval(async () => {
  try {
    // Grab all accumulated real packets, and clear the buffer
    const rawPackets = [...livePacketBuffer];
    livePacketBuffer = [];
    
    if (rawPackets.length === 0) {
      return; // Save CPU if no live traffic has been captured
    }
    
    // Send to our Python Microservice via Axios
    const fastApiUrl = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
    
    const response = await axiosInstance.post(`${fastApiUrl}/api/v1/analyze`, {
      packets: rawPackets
    });

    const mlResults = response.data.results;
    
    if (mlResults && mlResults.length > 0) {
      console.log(`[*] Sent ${rawPackets.length} real packets to FastAPI. Computed Threat Score: ${mlResults[0].threat_score}`);
      
      // Look for critical anomalies and store them in the database
      const anomaliesToSave = mlResults.filter(result => result.threat_score > 0.8).map(result => ({
          src_ip: result.src_ip || 'Unknown',
          dst_ip: result.dst_ip || 'Unknown',
          src_port: result.src_port || 0,
          dst_port: result.dst_port || 0,
          protocol: result.protocol || 'Unknown',
          threat_score: result.threat_score,
          total_packets: result.total_packets || 0,
          total_bytes: result.total_bytes || 0,
          reconstruction_error: result.reconstruction_error || null,
          entropy: result.entropy || null,
          timestamp: new Date()
      }));
      
      if (anomaliesToSave.length > 0 && mongoose.connection.readyState === 1) {
        try {
          await Anomaly.insertMany(anomaliesToSave);
          console.log(`[+] Saved ${anomaliesToSave.length} new anomalies to MongoDB.`);
        } catch (dbErr) {
          console.error('[-] Error saving to MongoDB:', dbErr.message);
        }
      }

      // Push the real PyTorch intelligence directly to the React frontend
      io.emit('network-update', mlResults);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
       console.log('[-] FastAPI Microservice not reachable. Is uvicorn running on port 8000?');
    } else {
       console.error('Error communicating with ML backend:', error.message);
    }
  }
}, 2000);


const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`[*] Node.js Primary Server running on port ${port}`);
});