import { app, BrowserWindow, ipcMain, safeStorage, session } from 'electron';
import path from 'node:path';

const isProduction = app.isPackaged;
const allowedDevOrigin = 'http://127.0.0.1:4200';
const apiOrigin = process.env.LICENSING_API_ORIGIN ?? 'http://127.0.0.1:3000';
const store = new Map<string, Buffer>();

const validKey = (value: unknown): value is string => {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,80}$/.test(value);
};

const validValue = (value: unknown): value is string => {
  return typeof value === 'string' && value.length <= 10_000;
};

const createWindow = async (): Promise<void> => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#F9FAFB',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.on('will-navigate', (event, url) => {
    const allowed = isProduction ? url.startsWith('file:') : url.startsWith(allowedDevOrigin);

    if (!allowed && !url.startsWith(apiOrigin)) {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (!isProduction) {
    await win.loadURL(allowedDevOrigin);
    win.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  await win.loadFile(path.join(__dirname, '../dist/web/browser/index.html'));
};

app.whenReady().then(async () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ${apiOrigin}; img-src 'self' data:;`,
        ],
      },
    });
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });

  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('secure-store:get', (_event, key: unknown) => {
    if (!validKey(key)) {
      throw new Error('Invalid key.');
    }

    const encrypted = store.get(key);

    if (encrypted === undefined) {
      return null;
    }

    return safeStorage.decryptString(encrypted);
  });

  ipcMain.handle('secure-store:set', (_event, key: unknown, value: unknown) => {
    if (!validKey(key) || !validValue(value)) {
      throw new Error('Invalid secure-store payload.');
    }

    store.set(key, safeStorage.encryptString(value));
  });

  ipcMain.handle('secure-store:delete', (_event, key: unknown) => {
    if (!validKey(key)) {
      throw new Error('Invalid key.');
    }

    store.delete(key);
  });

  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
