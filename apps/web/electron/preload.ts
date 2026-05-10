import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  version: '1.0.0',
  getAppVersion: () => ipcRenderer.invoke('app:get-version') as Promise<string>,
  secureStore: {
    get: (key: string) => ipcRenderer.invoke('secure-store:get', key) as Promise<string | null>,
    set: (key: string, value: string) =>
      ipcRenderer.invoke('secure-store:set', key, value) as Promise<void>,
    delete: (key: string) => ipcRenderer.invoke('secure-store:delete', key) as Promise<void>,
  },
});
