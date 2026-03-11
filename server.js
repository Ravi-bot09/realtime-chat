const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// In-memory state
const activeUsers = new Map(); // socketId -> { username, joinedAt }
const chatHistory = [];
const MAX_HISTORY = 100;

function addToHistory(msg) {
  chatHistory.push(msg);
  if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
}

io.on('connection', (socket) => {
  console.log(`[+] New connection: ${socket.id}`);

  // Send existing chat history to new user
  socket.emit('chat:history', chatHistory);

  // User joins with a username
  socket.on('user:join', (username) => {
    const trimmed = username.trim().slice(0, 24);
    if (!trimmed) return;

    // Check for duplicate names
    const taken = [...activeUsers.values()].some(
      (u) => u.username.toLowerCase() === trimmed.toLowerCase()
    );
    if (taken) {
      socket.emit('join:error', 'Username already taken. Try another.');
      return;
    }

    activeUsers.set(socket.id, { username: trimmed, joinedAt: Date.now() });

    socket.emit('join:success', { username: trimmed });

    const systemMsg = {
      type: 'system',
      text: `${trimmed} joined the chat`,
      timestamp: Date.now()
    };
    addToHistory(systemMsg);
    io.emit('chat:system', systemMsg);

    // Broadcast updated user list
    io.emit('users:update', getUserList());
    console.log(`[JOIN] ${trimmed}`);
  });

  // Incoming chat message
  socket.on('chat:message', (text) => {
    const user = activeUsers.get(socket.id);
    if (!user || !text || !text.trim()) return;

    const msg = {
      type: 'message',
      id: `${Date.now()}-${socket.id}`,
      username: user.username,
      text: text.trim().slice(0, 500),
      timestamp: Date.now()
    };

    addToHistory(msg);
    io.emit('chat:message', msg);
  });

  // Clear chat for everyone
  socket.on('chat:clear', () => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    chatHistory.length = 0;
    io.emit('chat:cleared', { by: user.username });
  });

  // Typing indicator
  socket.on('chat:typing', (isTyping) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    socket.broadcast.emit('chat:typing', { username: user.username, isTyping });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      const systemMsg = {
        type: 'system',
        text: `${user.username} left the chat`,
        timestamp: Date.now()
      };
      addToHistory(systemMsg);
      io.emit('chat:system', systemMsg);
      io.emit('users:update', getUserList());
      console.log(`[LEAVE] ${user.username}`);
    }
  });
});

function getUserList() {
  return [...activeUsers.values()].map((u) => ({
    username: u.username,
    joinedAt: u.joinedAt
  }));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chat server running on http://localhost:${PORT}`);
});
