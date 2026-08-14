<p align="center">
  <h1 align="center">âš¡ Synapse AI</h1>
  <p align="center">
    <strong>Real-Time Collaborative Code Editor with AI-Powered Debugging</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/Monaco-Editor-007ACC?style=flat-square&logo=visual-studio-code" alt="Monaco" />
    <img src="https://img.shields.io/badge/Yjs-CRDT-FF6B6B?style=flat-square" alt="Yjs" />
    <img src="https://img.shields.io/badge/OpenAI-GPT--4-412991?style=flat-square&logo=openai" alt="OpenAI" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis" alt="Redis" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker" alt="Docker" />
  </p>
</p>

---

## âœ¨ Features

- ðŸ”„ **Real-Time Collaboration** â€” Multiple users edit simultaneously with conflict-free sync via CRDTs (Yjs)
- ðŸ¤– **AI-Powered Debugging** â€” Integrated AI assistant detects bugs, explains code, and suggests fixes
- ðŸ‘¥ **Live Presence** â€” See collaborators' cursors, selections, and activity in real-time
- ðŸ“ **Virtual File System** â€” Create, manage, and organize files with a VS Code-like file explorer
- ðŸ’¬ **In-Editor Chat** â€” Communicate with collaborators without leaving the editor
- ðŸŽ¨ **Multi-Language Support** â€” Syntax highlighting for 20+ programming languages
- ðŸ” **Role-Based Access** â€” Owner, Editor, and Viewer roles for project collaboration
- ðŸŒ™ **Premium Dark Theme** â€” Stunning glassmorphism UI with smooth animations

---

## ðŸ—ï¸ Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   React +   â”‚â”€â”€â”€â”€â–¶â”‚  Node.js/Express â”‚â”€â”€â”€â”€â–¶â”‚ PostgreSQL  â”‚
â”‚   Monaco    â”‚     â”‚     REST API     â”‚     â”‚  Database   â”‚
â”‚   Editor    â”‚     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â”‚             â”‚     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Yjs CRDT  â”‚â—€â”€â”€â–¶â”‚  Yjs WebSocket   â”‚â”€â”€â”€â”€â–¶â”‚   Redis     â”‚
â”‚   Client    â”‚     â”‚    Server        â”‚     â”‚   Cache     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚  OpenAI GPT-4    â”‚
                    â”‚   AI Service     â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸš€ Quick Start

### Prerequisites

- **Node.js 20+** and npm
- **Docker** and Docker Compose (for PostgreSQL & Redis)
- **OpenAI API Key** (for AI features)

### 1. Clone & Configure

```bash
git clone https://github.com/yourusername/synapse-ai.git
cd synapse-ai

# Copy environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Start with Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, Server, Client)
docker-compose up -d

# The app will be available at:
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# Yjs WS:   ws://localhost:1234
```

### 3. Start without Docker (Development)

```bash
# Terminal 1: Start PostgreSQL and Redis (requires local installation)
# Or start just the databases with Docker:
docker-compose up -d postgres redis

# Terminal 2: Start the backend
cd server
npm install
npm run dev

# Terminal 3: Start the frontend
cd client
npm install
npm run dev
```

---

## ðŸ“ Project Structure

```
Code_collab/
â”œâ”€â”€ client/                  # React Frontend (Vite)
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/      # UI Components
â”‚   â”‚   â”‚   â”œâ”€â”€ AI/          # AI assistant panel
â”‚   â”‚   â”‚   â”œâ”€â”€ Auth/        # Login, Signup, AuthGuard
â”‚   â”‚   â”‚   â”œâ”€â”€ Collaboration/ # Chat, Presence, Share
â”‚   â”‚   â”‚   â”œâ”€â”€ Dashboard/   # Project dashboard
â”‚   â”‚   â”‚   â”œâ”€â”€ Editor/      # Monaco editor, tabs, cursors
â”‚   â”‚   â”‚   â”œâ”€â”€ FileExplorer/ # File tree, create modal
â”‚   â”‚   â”‚   â””â”€â”€ Layout/      # Navbar, Sidebar, StatusBar
â”‚   â”‚   â”œâ”€â”€ contexts/        # React contexts
â”‚   â”‚   â”œâ”€â”€ hooks/           # Custom hooks (Yjs, Auth, AI)
â”‚   â”‚   â”œâ”€â”€ services/        # API & WebSocket clients
â”‚   â”‚   â””â”€â”€ utils/           # Helpers, themes, config
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ server/                  # Node.js Backend (Express)
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ controllers/     # Request handlers
â”‚   â”‚   â”œâ”€â”€ middleware/      # Auth, rate limiting, errors
â”‚   â”‚   â”œâ”€â”€ models/          # Database models
â”‚   â”‚   â”œâ”€â”€ routes/          # API routes
â”‚   â”‚   â”œâ”€â”€ services/        # AI, context, presence
â”‚   â”‚   â””â”€â”€ websocket/       # Yjs provider, chat
â”‚   â”œâ”€â”€ migrations/          # SQL migrations
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ docker-compose.yml       # Full stack Docker setup
â”œâ”€â”€ nginx.conf               # Production reverse proxy
â””â”€â”€ .env.example             # Environment variables template
```

---

## ðŸ”Œ API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Get current user profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/invite` | Invite collaborator |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/files` | Get file tree |
| POST | `/api/projects/:id/files` | Create file/folder |
| GET | `/api/files/:fileId` | Get file content |
| PUT | `/api/files/:fileId` | Update file |
| DELETE | `/api/files/:fileId` | Delete file |

### AI Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/debug` | Debug code and get fix suggestions |
| POST | `/api/ai/explain` | Explain selected code |
| POST | `/api/ai/suggest` | Get code suggestions |
| POST | `/api/ai/chat` | Chat with AI about code |

---

## ðŸ› ï¸ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Monaco Editor |
| Real-Time Sync | Yjs (CRDT), WebSocket |
| Backend | Node.js, Express |
| AI | OpenAI GPT-4 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Containerization | Docker, Docker Compose |
| Reverse Proxy | Nginx |

---

## ðŸ¤ Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ðŸ“„ License

This project is licensed under the MIT License.

---

<p align="center">
  Built with â¤ï¸ using React, Node.js, Yjs, and OpenAI
</p>
