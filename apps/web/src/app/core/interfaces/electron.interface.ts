export interface ElectronSecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ElectronApi {
  version: string;
  getAppVersion(): Promise<string>;
  secureStore: ElectronSecureStore;
}

declare global {
  interface Window {
    electronAPI?: ElectronApi;
  }
}
