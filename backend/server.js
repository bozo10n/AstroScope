import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) cb(null, true);
    else cb(new Error('Only image files are allowed!'));
  }
});

const db = new sqlite3.Database('./nasa_viewer.db', (err) => {
  if (err) console.error('Error opening database:', err);
  else {
    console.log(' Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Create rooms table
    db.run('CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_activity DATETIME DEFAULT CURRENT_TIMESTAMP)');
    
    // Create annotations table (with optional z coordinate for 3D annotations)
    db.run('CREATE TABLE IF NOT EXISTS annotations (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, text TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, z REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (room_id) REFERENCES rooms(id))');
    
    // Create image overlays table (with width/height - overlays need size)
    db.run('CREATE TABLE IF NOT EXISTS image_overlays (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, image_path TEXT NOT NULL, original_name TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, width REAL NOT NULL, height REAL NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (room_id) REFERENCES rooms(id))');
    
    // Insert default room
    db.run("INSERT OR IGNORE INTO rooms (name, description) VALUES ('default', 'Default collaboration room')");
    
    console.log('✅ Database tables initialized');
  });
}

const rooms = new Map();

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/rooms', (req, res) => db.all('SELECT * FROM rooms ORDER BY last_activity DESC', [], (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows)));
app.post('/api/rooms', (req, res) => {
  const { name, description } = req.body;
  db.run('INSERT INTO rooms (name, description) VALUES (?, ?)', [name, description], function(err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ id: this.lastID, name, description });
  });
});
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ filename: req.file.filename, originalName: req.file.originalname, path: '/uploads/' + req.file.filename, size: req.file.size });
});

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  let currentRoom = null;
  let currentUser = null;

  socket.on('join-room', (data) => {
    const { roomId, userName, userId } = data;
    currentRoom = roomId;
    currentUser = { id: userId, name: userName, socketId: socket.id };
    
    // Join the room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(currentUser);
    
    // Update room activity
    db.run('UPDATE rooms SET last_activity = CURRENT_TIMESTAMP WHERE id = ?', [roomId]);
    
    // Send existing annotations to the joining user
    db.all('SELECT * FROM annotations WHERE room_id = ?', [roomId], (err, annotations) => {
      if (err) {
        console.error('Error fetching annotations:', err);
        socket.emit('existing-annotations', []);
      } else {
        console.log(`📝 Sending ${annotations.length} existing annotations to ${userName}`);
        socket.emit('existing-annotations', annotations);
      }
    });
    
    // Send existing overlays to the joining user
    db.all('SELECT * FROM image_overlays WHERE room_id = ?', [roomId], (err, overlays) => {
      if (err) {
        console.error('Error fetching overlays:', err);
        socket.emit('existing-overlays', []);
      } else {
        console.log(`🖼️ Sending ${overlays.length} existing overlays to ${userName}`);
        socket.emit('existing-overlays', overlays);
      }
    });
    
    // Get active users and notify everyone in the room
    const activeUsers = Array.from(rooms.get(roomId)).map(u => ({ 
      id: u.id, 
      name: u.name, 
      socketId: u.socketId 
    }));
    
    // Broadcast to all users in the room that a new user joined
    io.to(roomId).emit('user-joined', { 
      user: currentUser, 
      activeUsers 
    });
    
    console.log(`✅ ${userName} joined room ${roomId} (${activeUsers.length} users active)`);
  });

  socket.on('position-update', (data) => {
    if (currentRoom) {
      socket.to(currentRoom).emit('position-update', { 
        userId: currentUser.id, 
        userName: currentUser.name, 
        ...data 
      });
    }
  });

  socket.on('position-update-3d', (data) => {
    if (currentRoom) {
      socket.to(currentRoom).emit('position-update-3d', { 
        userId: currentUser.id, 
        userName: currentUser.name, 
        ...data 
      });
    }
  });

  socket.on('add-annotation', (data) => {
    const { roomId, userId, userName, text, x, y, z } = data;
    console.log(`➕ Adding annotation from ${userName}: "${text}" at (${x}, ${y}, ${z || 'N/A'})`);
    
    db.run(
      'INSERT INTO annotations (room_id, user_id, user_name, text, x, y, z) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [roomId, userId, userName, text, x, y, z || null], 
      function(err) {
        if (err) {
          console.error('❌ Failed to save annotation:', err);
          socket.emit('error', { message: 'Failed to save annotation' });
        } else {
          const annotation = { 
            id: this.lastID, 
            room_id: roomId, 
            user_id: userId, 
            user_name: userName, 
            text, 
            x, 
            y,
            z: z || null,
            timestamp: new Date().toISOString() 
          };
          console.log(`✅ Annotation saved with ID ${this.lastID}, broadcasting to room ${roomId}`);
          
          // Broadcast to ALL users in the room (including sender for confirmation)
          io.to(roomId).emit('annotation-added', annotation);
        }
      }
    );
  });

  socket.on('remove-annotation', (data) => {
    const { annotationId, roomId } = data;
    console.log(`🗑️ Removing annotation ${annotationId} from room ${roomId}`);
    
    db.run('DELETE FROM annotations WHERE id = ?', [annotationId], (err) => {
      if (err) {
        console.error('❌ Failed to remove annotation:', err);
        socket.emit('error', { message: 'Failed to remove annotation' });
      } else {
        console.log(`✅ Annotation ${annotationId} removed, broadcasting to room ${roomId}`);
        // Broadcast to ALL users in the room
        io.to(roomId).emit('annotation-removed', { annotationId });
      }
    });
  });

  socket.on('add-overlay', (data) => {
    const { roomId, userId, userName, imagePath, originalName, x, y, width, height } = data;
    console.log(`➕ Adding overlay from ${userName}: ${originalName}`);
    
    db.run(
      'INSERT INTO image_overlays (room_id, user_id, user_name, image_path, original_name, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [roomId, userId, userName, imagePath, originalName, x, y, width, height], 
      function(err) {
        if (err) {
          console.error('❌ Failed to save overlay:', err);
          socket.emit('error', { message: 'Failed to save overlay' });
        } else {
          const overlay = {
            id: this.lastID, 
            room_id: roomId, 
            user_id: userId, 
            user_name: userName, 
            image_path: imagePath, 
            original_name: originalName, 
            x, 
            y, 
            width, 
            height, 
            timestamp: new Date().toISOString()
          };
          console.log(`✅ Overlay saved with ID ${this.lastID}, broadcasting to room ${roomId}`);
          
          // Broadcast to ALL users in the room
          io.to(roomId).emit('overlay-added', overlay);
        }
      }
    );
  });

  socket.on('remove-overlay', (data) => {
    const { overlayId, roomId } = data;
    console.log(`🗑️ Removing overlay ${overlayId} from room ${roomId}`);
    
    // Get the image path before deleting
    db.get('SELECT image_path FROM image_overlays WHERE id = ?', [overlayId], (err, row) => {
      if (!err && row) {
        // Delete the image file
        const filePath = path.join(__dirname, row.image_path);
        fs.unlink(filePath, (e) => { 
          if (e) console.error('❌ Error deleting file:', e); 
        });
      }
      
      // Delete from database
      db.run('DELETE FROM image_overlays WHERE id = ?', [overlayId], (err) => {
        if (err) {
          console.error('❌ Failed to remove overlay:', err);
          socket.emit('error', { message: 'Failed to remove overlay' });
        } else {
          console.log(`✅ Overlay ${overlayId} removed, broadcasting to room ${roomId}`);
          // Broadcast to ALL users in the room
          io.to(roomId).emit('overlay-removed', { overlayId });
        }
      });
    });
  });

  socket.on('update-annotation-position', (data) => {
    const { annotationId, roomId, x, y } = data;
    db.run('UPDATE annotations SET x = ?, y = ? WHERE id = ?', [x, y, annotationId], (err) => {
      if (err) console.error('Failed to update annotation position:', err);
      else {
        // Broadcast to all clients in the room (including sender for confirmation)
        io.to(roomId).emit('annotation-position-updated', { annotationId, x, y });
      }
    });
  });

  socket.on('update-overlay-position', (data) => {
    const { overlayId, roomId, x, y } = data;
    db.run('UPDATE image_overlays SET x = ?, y = ? WHERE id = ?', [x, y, overlayId], (err) => {
      if (err) console.error('Failed to update overlay position:', err);
      else {
        // Broadcast to all clients in the room (including sender for confirmation)
        io.to(roomId).emit('overlay-position-updated', { overlayId, x, y });
      }
    });
  });

  socket.on('update-overlay-size', (data) => {
    const { overlayId, roomId, width, height } = data;
    db.run('UPDATE image_overlays SET width = ?, height = ? WHERE id = ?', [width, height, overlayId], (err) => {
      if (err) console.error('Failed to update overlay size:', err);
      else {
        // Broadcast to all clients in the room (including sender for confirmation)
        io.to(roomId).emit('overlay-size-updated', { overlayId, width, height });
      }
    });
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      const roomUsers = rooms.get(currentRoom);
      if (roomUsers) {
        roomUsers.delete(currentUser);
        const activeUsers = Array.from(roomUsers).map(u => ({ id: u.id, name: u.name, socketId: u.socketId }));
        io.to(currentRoom).emit('user-left', { user: currentUser, activeUsers });
        if (roomUsers.size === 0) rooms.delete(currentRoom);
      }
      console.log('❌ ' + currentUser.name + ' left room ' + currentRoom);
    }
    console.log('👤 User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log('🚀 Server running on http://localhost:' + PORT));
