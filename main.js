const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "Secure Vault - Password Manager",
    icon: path.join(__dirname, 'frontend/public/favicon.ico')
  });

  // Load the frontend (if dev server is on, use it; otherwise use static dist)
  const isDev = process.env.NODE_ENV === 'development';
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'frontend/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start the Backend Server (fork its process)
function startBackend() {
    const backendPath = path.join(__dirname, 'backend/server.js');
    console.log(`Starting backend server from: ${backendPath}`);
    
    // We use fork so it runs as a managed node process
    backendProcess = fork(backendPath, [], {
        cwd: path.join(__dirname, 'backend'),
        env: { ...process.env, NODE_ENV: 'production' }
    });

    backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err);
    });

    backendProcess.on('exit', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

app.on('ready', () => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (backendProcess) backendProcess.kill();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('quit', () => {
    if (backendProcess) backendProcess.kill();
});
