# CHATTER — Real-Time Chat App

A polished multi-user group chat built with **Node.js**, **Socket.IO**, and vanilla **JS/HTML/CSS**.

## Features
- 🔴 Live message broadcasting to all connected users
- 👤 Username authentication with duplicate-name prevention
- 📋 Chat history persisted for new joiners (last 100 messages)
- 🟢 Join/leave system notifications
- ⏱ Message timestamps
- 🎵 Audio ping on new messages
- 💬 Real-time typing indicators
- 👥 Live user list sidebar with avatars
- 📱 Responsive design (mobile-friendly)

## Local Development

```bash
npm install
npm run dev     # with auto-reload (nodemon)
# or
npm start       # plain node
```

Visit `http://localhost:3000`

## Deploy to Vercel

> ⚠️ **Important Note on Socket.IO + Vercel**
> Vercel is a serverless platform — it doesn't support persistent WebSocket connections natively. For production use, deploy to a platform that supports long-lived connections:

### ✅ Recommended Platforms (full WebSocket support)
| Platform | How |
|----------|-----|
| **Railway** | Connect GitHub repo → auto-deploys |
| **Render** | New Web Service → connect repo |
| **Fly.io** | `flyctl launch` |
| **Heroku** | `git push heroku main` |
| **DigitalOcean App Platform** | Connect repo |

### Deploy to Railway (easiest)
1. Push this project to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo — it auto-detects Node.js and runs `npm start`
4. Done! 🎉

### Deploy to Render
1. Push to GitHub
2. [render.com](https://render.com) → New Web Service → connect repo
3. Build command: `npm install`  
4. Start command: `npm start`

### If you still want Vercel (polling fallback)
Socket.IO will automatically fall back to HTTP long-polling on serverless platforms, which works but is less efficient. The `vercel.json` included in this project handles routing. Just run:

```bash
npm i -g vercel
vercel
```

## Project Structure
```
realtime-chat/
├── server.js          # Express + Socket.IO server
├── public/
│   ├── index.html     # Main HTML
│   ├── css/style.css  # All styles
│   └── js/app.js      # Client-side Socket.IO logic
├── vercel.json        # Vercel routing config
└── package.json
```
