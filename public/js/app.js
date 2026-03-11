/* ─── CHATTER — CLIENT APP ─────────────────────── */

const socket = io();
let myUsername = null;
let typingTimer = null;
let isTyping = false;
const typingUsers = new Set();

// ─── AUDIO ALERT ─────────────────────────────────
function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) { /* ignore */ }
}

// ─── DOM REFS ─────────────────────────────────────
const joinScreen    = document.getElementById('join-screen');
const chatScreen    = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const charCount     = document.getElementById('char-count');
const joinBtn       = document.getElementById('join-btn');
const joinError     = document.getElementById('join-error');
const messagesArea  = document.getElementById('messages');
const msgInput      = document.getElementById('msg-input');
const sendBtn       = document.getElementById('send-btn');
const userList      = document.getElementById('user-list');
const onlineCount   = document.getElementById('online-count');
const typingIndicator = document.getElementById('typing-indicator');
const leaveBtn      = document.getElementById('leave-btn');
const myBadge       = document.getElementById('my-badge');

// ─── JOIN SCREEN LOGIC ────────────────────────────
usernameInput.addEventListener('input', () => {
  charCount.textContent = `${usernameInput.value.length}/24`;
});

usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});

joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) return;
  joinError.classList.add('hidden');
  socket.emit('user:join', username);
});

socket.on('join:error', (msg) => {
  joinError.textContent = msg;
  joinError.classList.remove('hidden');
  usernameInput.focus();
});

socket.on('join:success', ({ username }) => {
  myUsername = username;
  myBadge.textContent = `@ ${username}`;
  joinScreen.classList.remove('active');
  chatScreen.classList.add('active');
  msgInput.focus();
});

// ─── CHAT HISTORY ─────────────────────────────────
socket.on('chat:history', (history) => {
  history.forEach(renderMessage);
  scrollToBottom();
});

// ─── INCOMING MESSAGES ────────────────────────────
socket.on('chat:message', (msg) => {
  renderMessage(msg);
  if (msg.username !== myUsername) playPing();
  scrollToBottom();
});

socket.on('chat:system', (msg) => {
  renderMessage(msg);
  scrollToBottom();
});

// ─── RENDER A MESSAGE ─────────────────────────────
function renderMessage(msg) {
  if (msg.type === 'system') {
    const el = document.createElement('div');
    el.className = 'msg-system';
    const action = msg.text.includes('joined') ? 'joined' : 'left';
    const name = msg.text.replace(` ${action} the chat`, '');
    el.innerHTML = `<span>${name}</span> ${action} the chat`;
    messagesArea.appendChild(el);
    return;
  }

  const isMine = msg.username === myUsername;
  const wrapper = document.createElement('div');
  wrapper.className = `msg ${isMine ? 'mine' : 'theirs'}`;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const nameEl = document.createElement('span');
  nameEl.className = 'msg-username';
  nameEl.textContent = msg.username;

  const timeEl = document.createElement('span');
  timeEl.className = 'msg-time';
  timeEl.textContent = formatTime(msg.timestamp);

  meta.appendChild(nameEl);
  meta.appendChild(timeEl);

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = msg.text;

  wrapper.appendChild(meta);
  wrapper.appendChild(bubble);
  messagesArea.appendChild(wrapper);
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ─── SEND MESSAGE ─────────────────────────────────
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit('chat:message', text);
  msgInput.value = '';
  stopTyping();
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ─── TYPING INDICATORS ────────────────────────────
msgInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit('chat:typing', true);
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 2000);
});

function stopTyping() {
  if (isTyping) {
    isTyping = false;
    socket.emit('chat:typing', false);
  }
  clearTimeout(typingTimer);
}

socket.on('chat:typing', ({ username, isTyping: active }) => {
  if (active) {
    typingUsers.add(username);
  } else {
    typingUsers.delete(username);
  }
  renderTyping();
});

function renderTyping() {
  const users = [...typingUsers];
  if (users.length === 0) {
    typingIndicator.classList.add('hidden');
    typingIndicator.textContent = '';
  } else {
    typingIndicator.classList.remove('hidden');
    if (users.length === 1) {
      typingIndicator.textContent = `${users[0]} is typing...`;
    } else {
      typingIndicator.textContent = `${users.slice(0, -1).join(', ')} and ${users.at(-1)} are typing...`;
    }
  }
}

// ─── USER LIST ────────────────────────────────────
// Color palette for user avatars
const avatarColors = [
  '#e8ff47','#47ffe8','#ff47e8','#ff8c47','#47a6ff',
  '#a647ff','#ff4747','#47ff84','#ffc947','#47c8ff'
];

function getUserColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return avatarColors[hash % avatarColors.length];
}

socket.on('users:update', (users) => {
  onlineCount.textContent = `${users.length} online`;
  userList.innerHTML = '';
  users.forEach((u) => {
    const li = document.createElement('li');
    li.className = `user-item${u.username === myUsername ? ' me' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.textContent = u.username[0].toUpperCase();
    const color = getUserColor(u.username);
    avatar.style.background = `${color}22`;
    avatar.style.color = color;
    avatar.style.border = `1px solid ${color}44`;

    const name = document.createElement('span');
    name.textContent = u.username === myUsername ? `${u.username} (you)` : u.username;

    li.appendChild(avatar);
    li.appendChild(name);
    userList.appendChild(li);
  });
});

// ─── LEAVE ────────────────────────────────────────
leaveBtn.addEventListener('click', () => {
  chatScreen.classList.remove('active');
  joinScreen.classList.add('active');
  myUsername = null;
  usernameInput.value = '';
  charCount.textContent = '0/24';
  messagesArea.innerHTML = '';
  typingUsers.clear();
  renderTyping();
  socket.disconnect();
  setTimeout(() => socket.connect(), 200);
  usernameInput.focus();
});

// ─── RECONNECT ────────────────────────────────────
socket.on('disconnect', () => {
  if (myUsername) {
    const el = document.createElement('div');
    el.className = 'msg-system';
    el.textContent = '⚠ Connection lost. Reconnecting...';
    messagesArea.appendChild(el);
    scrollToBottom();
  }
});

socket.on('connect', () => {
  if (myUsername) {
    socket.emit('user:join', myUsername);
  }
});
