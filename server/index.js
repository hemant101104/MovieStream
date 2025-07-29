// ...existing code...
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
// Removed invalid import {socket } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your-secret-key';
const DATA_DIR = join(__dirname, 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const ROOMS_FILE = join(DATA_DIR, 'rooms.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  import('fs').then(fs => fs.mkdirSync(DATA_DIR, { recursive: true }));
}

// Initialize data files
if (!existsSync(USERS_FILE)) {
  writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!existsSync(ROOMS_FILE)) {
  writeFileSync(ROOMS_FILE, JSON.stringify([]));
}

// Helper functions
const readUsers = () => JSON.parse(readFileSync(USERS_FILE, 'utf8'));
const writeUsers = (users) => writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
const readRooms = () => JSON.parse(readFileSync(ROOMS_FILE, 'utf8'));
const writeRooms = (rooms) => writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const users = readUsers();
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    const token = jwt.sign({ id: newUser.id, username, email }, JWT_SECRET);
    res.json({ token, user: { id: newUser.id, username, email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.email === email);

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/rooms', authenticateToken, (req, res) => {
  try {
    const { name, isPrivate } = req.body;
    const rooms = readRooms();
    
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom = {
      id: Date.now().toString(),
      name,
      code: roomCode,
      hostId: req.user.id,
      hostUsername: req.user.username,
      isPrivate,
      participants: [],
      currentVideo: null,
      videoState: {
        playing: false,
        currentTime: 0,
        url: null
      },
      createdAt: new Date().toISOString()
    };

    rooms.push(newRoom);
    writeRooms(rooms);

    res.json(newRoom);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/rooms', authenticateToken, (req, res) => {
  try {
    const rooms = readRooms();
    const publicRooms = rooms.filter(room => !room.isPrivate);
    res.json(publicRooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/rooms/join', authenticateToken, (req, res) => {
  try {
    const { roomCode } = req.body;
    const rooms = readRooms();
    const room = rooms.find(r => r.code === roomCode);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Host sets video (file or URL), broadcast to all
  socket.on('set-video', (data) => {
    const { url } = data;
    const roomCode = socket.roomCode;
    if (roomCode && url) {
      io.to(roomCode).emit('video-selected', { url });
    }
  });

  socket.on('join-room', (data) => {
    const { roomCode, user } = data;
    socket.join(roomCode);
    socket.user = user;
    socket.roomCode = roomCode;

    // Add user to room participants
    const rooms = readRooms();
    const room = rooms.find(r => r.code === roomCode);
    if (room) {
      room.participants = room.participants.filter(p => p.id !== user.id);
      room.participants.push({ ...user, socketId: socket.id });
      writeRooms(rooms);

      // Notify all participants
      socket.to(roomCode).emit('user-joined', {
        user,
        participants: room.participants,
        hostId: room.hostId,
        hostUsername: room.hostUsername
      });
      socket.emit('room-state', {
        participants: room.participants,
        videoState: room.videoState,
        currentVideo: room.currentVideo,
        hostId: room.hostId,
        hostUsername: room.hostUsername
      });
    }
  });

  socket.on('video-action', (data) => {
    const { action, currentTime, url } = data;
    const roomCode = socket.roomCode;
    
    if (roomCode) {
      const rooms = readRooms();
      const room = rooms.find(r => r.code === roomCode);
      
      if (room) {
        room.videoState = {
          playing: action === 'play',
          currentTime: currentTime || 0,
          url: url || room.videoState.url
        };
        writeRooms(rooms);

        socket.to(roomCode).emit('video-sync', {
          action,
          currentTime,
          url,
          timestamp: Date.now()
        });
      }
    }
  });

  socket.on('chat-message', (data) => {
    const { message, user } = data;
    const roomCode = socket.roomCode;
    
    if (roomCode) {
      const chatMessage = {
        id: Date.now().toString(),
        message,
        user,
        timestamp: new Date().toISOString()
      };

      io.to(roomCode).emit('chat-message', chatMessage);
    }
  });

  socket.on('webrtc-signal', (data) => {
    const { to, signal } = data;
    io.to(to).emit('webrtc-signal', {
      from: socket.id,
      signal
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.roomCode) {
      const rooms = readRooms();
      const room = rooms.find(r => r.code === socket.roomCode);
      
      if (room) {
        room.participants = room.participants.filter(p => p.socketId !== socket.id);
        writeRooms(rooms);

        socket.to(socket.roomCode).emit('user-left', {
          socketId: socket.id,
          participants: room.participants,
          hostId: room.hostId,
          hostUsername: room.hostUsername
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

