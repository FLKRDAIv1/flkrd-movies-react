
import { isTauri } from '../utils/tauriUtils';
import { sendNotification, requestPermission } from '@tauri-apps/plugin-notification';
import { message, confirm } from '@tauri-apps/plugin-dialog';
import { open } from '@tauri-apps/plugin-shell';
import { type as osType } from '@tauri-apps/plugin-os';

export const tauriService = {
  async notify(title: string, body?: string) {
    if (!isTauri()) return;
    
    let permissionGranted = await requestPermission();
    if (permissionGranted === 'granted') {
      sendNotification({ title, body, icon: 'https://i.imgur.com/4HoT8Yf.png' });
    }
  },

  async alert(text: string, title: string = 'FLKRD') {
    if (isTauri()) {
      await message(text, { title, kind: 'info' });
    } else {
      alert(text);
    }
  },

  async confirm(text: string, title: string = 'FLKRD'): Promise<boolean> {
    if (isTauri()) {
      return await confirm(text, { title, kind: 'warning' });
    } else {
      return window.confirm(text);
    }
  },

  async openExternal(url: string) {
    if (isTauri()) {
      await open(url);
    } else {
      window.open(url, '_blank');
    }
  },

  async getOS() {
    if (isTauri()) {
      return await osType();
    }
    return 'web';
  }
};
