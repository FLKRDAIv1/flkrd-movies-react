
export const isTauri = (): boolean => {
  return !!(window as any).__TAURI_INTERNALS__;
};
