# 🛡️ Secure Vault

> A zero-knowledge password manager where the server NEVER sees your plaintext passwords.

🔗 **Live App:** [https://password-management-system-tau.vercel.app](https://password-management-system-tau.vercel.app)

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![React](https://img.shields.io/badge/react-18-61dafb)

---

## Security Architecture

```
Master Password (never transmitted)
         │
         ▼
   PBKDF2 (600,000 iterations, SHA-256)
         │
    ┌────┴────┐
    ▼         ▼
Master Key   Auth Key
(AES-256)    (sent to server)
    │              │
    ▼              ▼
Encrypt/     bcrypt hash
Decrypt      stored in DB
vault data
    │
    ▼
Server stores ONLY:
ciphertext + IV + authTag
(cannot decrypt anything)
```

**Key principles:**
- Master password → PBKDF2 (600K iterations) → **Master Key** (stays in browser memory, non-extractable)
- Separate PBKDF2 derivation → **Auth Key** (sent to server, bcrypt hashed)
- All vault data encrypted client-side with **AES-256-GCM** before transmission
- Server is **zero-knowledge** — stores only ciphertext, IV, and auth tags

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Vite 5, Tailwind CSS 3 |
| Backend | Node.js, Express 4 (ES modules) |
| Database | MongoDB (Mongoose 8) / In-memory fallback |
| Auth | JWT (15min access + 7d refresh), bcryptjs, PBKDF2 |
| Encryption | Web Crypto API (AES-256-GCM), non-extractable keys |
| Validation | Zod (backend), zxcvbn (password strength) |
| Security | Helmet, express-rate-limit, HttpOnly cookies |
| Desktop | Electron |
| Logging | Winston |
| Deployment | Render.com (backend), Vercel (frontend), MongoDB Atlas |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### 1. Clone & install

```bash
git clone https://github.com/Rxhulmxhxto29/Password-Management-System.git
cd Password-Management-System

# Install all dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:
- `MONGO_URI` — MongoDB Atlas connection string (or leave empty for in-memory DB)
- `JWT_SECRET` — 64-char random string (`openssl rand -hex 32`)

### 3. Run in development

```bash
# Web only (no Electron)
npm run web:dev

# Or with Electron desktop wrapper
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/v1
- Health check: http://localhost:5000/health

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Create account with authKey + salt |
| GET | `/api/v1/auth/salt/:username` | No | Get PBKDF2 salt (anti-enumeration) |
| POST | `/api/v1/auth/login` | No | Login, returns JWT + refresh cookie |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Revoke refresh token |
| GET | `/api/v1/passwords` | Yes | List vault entries (paginated) |
| POST | `/api/v1/passwords` | Yes | Create encrypted entry |
| PUT | `/api/v1/passwords/:id` | Yes | Update encrypted entry |
| DELETE | `/api/v1/passwords/:id` | Yes | Delete entry |
| GET | `/health` | No | Health check |

---

## Security Features

- ✅ **Zero-knowledge** — server never sees plaintext passwords
- ✅ **PBKDF2 600K iterations** (OWASP 2024 recommendation)
- ✅ **AES-256-GCM** authenticated encryption (client-side)
- ✅ **Non-extractable CryptoKey** — master key can't be exported via JS
- ✅ **15-minute JWT** access tokens (short-lived)
- ✅ **HttpOnly refresh cookies** (not accessible via JavaScript)
- ✅ **Refresh token rotation** with bcrypt-hashed server storage
- ✅ **Rate limiting** — 10 auth requests / 15 min per IP
- ✅ **Helmet** strict CSP headers
- ✅ **Username enumeration prevention** (fake salt for unknown users)
- ✅ **Timing-safe login** (bcrypt runs even for invalid usernames)
- ✅ **Zod validation** on all API inputs
- ✅ **Ownership verification** on all password CRUD
- ✅ **Clipboard auto-clear** after 30 seconds
- ✅ **Password auto-hide** after 5 seconds
- ✅ **No stack traces** in production error responses

---

## Deployment (100% Free)

### MongoDB Atlas (free 512MB tier)
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free M0 cluster
3. Add database user and whitelist `0.0.0.0/0`
4. Copy connection string

### Backend on Render.com (free tier)
1. New → Web Service → connect GitHub repo
2. Root directory: `backend`
3. Build: `npm install` | Start: `node server.js`
4. Environment variables:
   - `PORT=10000`
   - `MONGO_URI=<your atlas URI>`
   - `JWT_SECRET=<64-char random string>`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://your-app.vercel.app`

### Frontend on Vercel (free tier)
1. Import GitHub repo → root: `frontend`
2. Build: `npm run build` | Output: `dist`
3. Environment variable: `VITE_API_URL=https://your-backend.onrender.com/api/v1`

### Desktop .exe
```bash
npm run build
# Output in dist-desktop/
```

---

## License

MIT
