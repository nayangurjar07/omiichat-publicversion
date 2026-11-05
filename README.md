# Omii: Real-Time Stranger Chat & Connection Platform

> **Showcase Edition**: This repository is a sanitized, production-grade public showcase of **OmiiChat**. All proprietary deployment configurations, database secrets, and past git history have been stripped and replaced with modular configuration templates.

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Platform Overview

**Omii** is a modern, high-concurrency, privacy-centric real-time stranger chat and community platform. It enables users worldwide to connect anonymously in seconds through 1-to-1 matchmaking, live public topic rooms, and private group rooms with rich multimedia messaging (voice notes, media, blur safety veils).

### Core Architectural Capabilities
- **Sub-50ms Real-Time Engine**: Powered by Socket.IO with memory-efficient pairing queues, heartbeat ping/pong keepalive, and graceful reconnect logic.
- **Safety Veil & Automated Moderation**: Incoming images are automatically veiled behind an explicit click-to-reveal blur with pluggable backend AI moderation hooks.
- **Mutual 24-Hour Reconnection**: Pairs who enjoy their chat can exchange a 24-hour cryptographic token to resume their conversation later.
- **Zero-Friction Anonymous Mode**: No compulsory sign-ups; optional user accounts powered by secure JWTs and Prisma ORM.

---

## 🏗️ Architecture & Modules

```
                    ┌────────────────────────┐
                    │    Omii Web Client     │
                    │   (Next.js 14 / App)   │
                    └───────────┬────────────┘
                                │
                    WebSocket / HTTP REST
                                │
                                ▼
                    ┌────────────────────────┐
                    │   Omii Backend Server  │
                    │  (Node.js + Socket.IO) │
                    └───────────┬────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ Matchmaking  │       │  Prisma ORM  │       │ Pluggable    │
  │ Queue & Hub  │       │ (Postgres/DB)│       │ Cloud S3/R2  │
  └──────────────┘       └──────────────┘       └──────────────┘
```

---

## 🚀 Core Features

### 1. 1-to-1 Anonymous Matchmaking
- Instant pairing algorithm matching users by shared interests or random discovery.
- In-memory ephemeral state for active chats ensuring zero chat message persistence on the server.

### 2. Public Topic Rooms (`/rooms`)
- Live directory of topic rooms: Gaming Hub, Music Lounge, Cinema, Campus, Tech, and Regional Hubs.
- Real-time online participant counters and system join/leave notices.
- Sliding-window rate limiting, profanity/spam filtering, and message-level report hooks.

### 3. Voice Notes & Secure Image Sharing
- **Voice Notes**: In-browser Web Audio API recording with a 30-second cap and live waveform player.
- **Image Sharing**: Binary magic byte verification, strict 3MB limit, and pluggable cloud storage (`IStorageService`).

### 4. Pluggable Storage Layer
The backend implements a clean storage abstraction (`IStorageService`):
- Local filesystem driver for zero-dependency development.
- S3-compatible cloud storage driver (AWS S3, Cloudflare R2, Supabase Storage).

---

## 💻 Tech Stack Breakdown

- **Web Frontend**: [Next.js 14](https://nextjs.org/) (App Router), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), Lucide Icons
- **Backend Server**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [Socket.IO](https://socket.io/)
- **Database & Modeling**: [Prisma ORM](https://www.prisma.io/) (PostgreSQL / SQLite compatibility)
- **Audio / Media Processing**: Web Audio API & MediaRecorder API

---

## 🛠️ Quickstart & Local Setup

### Prerequisites
- Node.js (v18.0.0+)
- npm

### 1. Clone the Repository
```bash
git clone https://github.com/nayangurjar07/omiichat-showcase.git
cd omiichat-showcase
```

### 2. Configure Environment Variables
Copy root template or individual configs:
```bash
cp server/.env.example server/.env
cp web/.env.example web/.env.local
```

### 3. Install Dependencies & Initialize Database
```bash
# Install root, backend, and frontend packages
npm install
cd server && npm install && npx prisma generate && npx prisma db push && cd ..
cd web && npm install && cd ..
```

### 4. Run Development Servers
```bash
# Run both frontend and backend concurrently
npm run dev
```

- Web Client: `http://localhost:3000`
- Backend API & Socket: `http://localhost:3001`

---

## 📄 License & Attribution

This project is licensed under the [MIT License](LICENSE).  
Created & Maintained by [Nayan Gurjar](https://github.com/nayangurjar07).
