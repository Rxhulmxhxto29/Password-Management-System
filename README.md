# 🔐 Secure Vault - Zero-Knowledge Password Manager

> A highly secure, full-stack password management system built with the MERN stack (MongoDB, Express, React, Node.js) and wrapped in a cross-platform desktop Electron application. 

![Secure Vault Banner](https://via.placeholder.com/800x200.png?text=Secure+Vault+-+Password+Manager)

## ✨ Core Features

- **🔐 End-to-End Encryption:** Uses industrial-grade AES encryption for vault storage and bcrypt for master password hashing.
- **📱 Cross-Platform Desktop App:** Includes a native desktop wrapper powered by Electron for seamless desktop usage.
- **🛡️ Zero-Knowledge Architecture:** The server only stores encrypted blobs; it never knows your actual passwords.
- **🔑 Secure Authentication:** Stateless session management using JWT (JSON Web Tokens).
- **🌗 Modern UI/UX:** Responsive, dark-themed interface built with React, Vite, and Tailwind CSS.
- **📋 One-Click Copy:** Easily copy passwords to the clipboard.
- **🎲 Smart Password Generator:** Built-in tools for generating strong, customized passwords.
- **🛠️ Zero-Config Testing:** Fallback in-memory MongoDB environment allows for instant testing without local database setup.

---

## 🏗️ Technology Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js, Mongoose (MongoDB)
- **Desktop:** Electron, Electron Builder
- **Security:** Helmet, Rate Limiter, Crypto API (AES-256), bcrypt, jsonwebtoken

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- *(Optional)* [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas URI)

### Quick Start (Development)

This project uses `concurrently` to run the frontend, backend, and Electron app completely automated from the root folder.

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/yourusername/Password-Management-System.git
   cd Password-Management-System
   ```

2. **Install Root Dependencies:**
   ```bash
   npm install
   ```

3. **Install Frontend & Backend Dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

4. **Run the Application:**
   ```bash
   npm run dev
   ```
   *This command will automatically:*
   - Start the Express backend on `http://localhost:5000`
   - If no MongoDB is found, it automatically spins up a temporary in-memory database for testing.
   - Start the React Vite frontend on `http://localhost:3000`
   - Launch the Electron Desktop application.

---

## ⚙️ Environment Variables Config (Production)

For a production environment, you should create `.env` files rather than relying on development fallbacks.

**`backend/.env`**
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pwd-manager
JWT_SECRET=your_super_secret_jwt_key
AES_SECRET=your_super_secret_aes_encryption_key
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📦 Building for Production

### Desktop Application (.exe / .app)
To package the project into a standalone desktop executable:
```bash
npm run build
```
This builds the frontend assets and uses `electron-builder` to generate the output in the `dist-desktop/` folder.

### Web Deployment
1. **Backend:** Deploy the `backend/` folder to services like Render, Railway, or Heroku. Ensure environment variables are set.
2. **Frontend:** Deploy the `frontend/` folder to Vercel, Netlify, or Cloudflare Pages. Set the build command to `npm run build` and output directory to `dist`.

---

## 🔒 Security Notice

This is a demonstration project. If you plan to use this for storing actual sensitive data in production:
1. Ensure you use HTTPS/TLS connections.
2. Change the default `JWT_SECRET` and `AES_SECRET` keys.
3. Host your own remote MongoDB cluster (like MongoDB Atlas) and disable the fallback memory-server.
4. Keep the `.env` files out of version control.

