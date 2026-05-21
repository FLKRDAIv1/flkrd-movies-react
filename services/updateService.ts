import { supabase } from '../utils/supabaseClient';
import { tauriService } from './tauriService';
import { isTauri } from '../utils/tauriUtils';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  changelog: string[];
  isForceUpdate: boolean;
  platform: 'macos' | 'android' | 'web';
}

const CURRENT_VERSIONS = {
  macos: '0.1.0',
  android: '0.1.0',
  web: '3.4.1'
};

/**
 * Parses and compares two version strings (semver).
 * Returns true if remote is strictly greater than current.
 */
export function isNewerVersion(current: string, remote: string): boolean {
  const cParts = current.replace(/^v/, '').split('.').map(num => parseInt(num, 10) || 0);
  const rParts = remote.replace(/^v/, '').split('.').map(num => parseInt(num, 10) || 0);
  
  const maxLength = Math.max(cParts.length, rParts.length);
  for (let i = 0; i < maxLength; i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > c) return true;
    if (c > r) return false;
  }
  return false;
}

export const updateService = {
  /**
   * Resolves the active platform.
   */
  async getPlatform(): Promise<'macos' | 'android' | 'web'> {
    if (isTauri()) {
      try {
        const os = await tauriService.getOS();
        const osLower = String(os).toLowerCase();
        if (osLower.includes('macos') || osLower.includes('darwin')) {
          return 'macos';
        }
        if (osLower.includes('android')) {
          return 'android';
        }
      } catch (e) {
        console.warn('[UPDATE SERVICE] Failed to determine Tauri OS type, fallback to macos:', e);
        return 'macos';
      }
    }
    
    // Web detection
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) {
      return 'android';
    }
    return 'web';
  },

  /**
   * Fetches update settings from Supabase and performs version checking.
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const platform = await this.getPlatform();
    const currentVersion = CURRENT_VERSIONS[platform];

    try {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .eq('platform', platform)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const latestVersion = data.version;
        const updateAvailable = isNewerVersion(currentVersion, latestVersion);

        return {
          updateAvailable,
          currentVersion,
          latestVersion,
          downloadUrl: data.download_url || '',
          changelog: data.changelog || [],
          isForceUpdate: !!data.is_force_update,
          platform
        };
      }
    } catch (e) {
      console.warn('[UPDATE SERVICE] Failed to reach Supabase registry. Running offline fallback check:', e);
    }

    // Offline / Failed fallback simulation or no update
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      downloadUrl: '',
      changelog: [],
      isForceUpdate: false,
      platform
    };
  },

  /**
   * Directs the user to complete the update depending on their platform.
   */
  async executeUpdate(result: UpdateCheckResult): Promise<void> {
    if (!result.updateAvailable) return;

    if (result.platform === 'web') {
      // For web, hard reload the app while clearing caches
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
        window.location.reload();
      } catch (e) {
        console.error('[UPDATE SERVICE] Failed to clear Service Worker, performing standard reload:', e);
        window.location.reload();
      }
    } else {
      // For macOS (DMG) and Android (APK), open the download link externally
      if (result.downloadUrl) {
        await tauriService.openExternal(result.downloadUrl);
      } else {
        const repoUrl = 'https://github.com/FLKRDAIv1/flkrd-movies-react/releases';
        await tauriService.openExternal(repoUrl);
      }
    }
  }
};
