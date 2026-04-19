import { app, BrowserWindow, shell } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fork } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
let mainWindow;
let backendProcess;

function startBackend() {
  if (!isDev) {
    backendProcess = fork(join(__dirname, 'backend/server.js'), [], {
      env: { ...process.env, PORT: '5000' },
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: join(__dirname, 'frontend/public/favicon.ico'),
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${join(__dirname, 'frontend/dist/index.html')}`;

  mainWindow.loadURL(url);

  // Open external links in default browser, not inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(createWindow, isDev ? 0 : 2000);
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
