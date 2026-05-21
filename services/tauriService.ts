
import { isTauri } from '../utils/tauriUtils';

export const tauriService = {
  async notify(title: string, body?: string) {
    if (!isTauri()) return;
    
    try {
      const { sendNotification, requestPermission } = await import('@tauri-apps/plugin-notification');
      let permissionGranted = await requestPermission();
      if (permissionGranted === 'granted') {
        sendNotification({ title, body });
      }
    } catch (e) {
      console.error('Failed to send Tauri notification:', e);
    }
  },

  async alert(text: string, title: string = 'FLKRD') {
    if (isTauri()) {
      try {
        const { message } = await import('@tauri-apps/plugin-dialog');
        await message(text, { title, kind: 'info' });
      } catch (e) {
        console.error('Failed to show Tauri alert:', e);
        alert(text);
      }
    } else {
      alert(text);
    }
  },

  async confirm(text: string, title: string = 'FLKRD'): Promise<boolean> {
    if (isTauri()) {
      try {
        const { confirm } = await import('@tauri-apps/plugin-dialog');
        return await confirm(text, { title, kind: 'warning' });
      } catch (e) {
        console.error('Failed to show Tauri confirm:', e);
        return window.confirm(text);
      }
    } else {
      return window.confirm(text);
    }
  },

  async openExternal(url: string) {
    if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
      } catch (e) {
        console.error('Failed to open external Tauri URL:', e);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  },

  async getOS() {
    if (isTauri()) {
      try {
        const { type: osType } = await import('@tauri-apps/plugin-os');
        return await osType();
      } catch (e) {
        console.error('Failed to get Tauri OS type:', e);
      }
    }
    return 'web';
  }
};
