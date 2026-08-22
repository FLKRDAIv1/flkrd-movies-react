import { MyListItem } from '../types';

let cachedList: MyListItem[] | null = null;
let cachedIdSet: Set<string | number> | null = null;
const subscribers = new Set<() => void>();

function ensureLoaded(): void {
  if (cachedList === null || cachedIdSet === null) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('myList') : null;
      cachedList = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cachedList)) cachedList = [];
    } catch {
      cachedList = [];
    }
    cachedIdSet = new Set(cachedList.map((i: any) => i.id));
  }
}

export function getMyList(): MyListItem[] {
  ensureLoaded();
  return cachedList || [];
}

export function isItemInMyList(id: string | number): boolean {
  ensureLoaded();
  return cachedIdSet ? (cachedIdSet.has(id) || cachedIdSet.has(Number(id)) || cachedIdSet.has(String(id))) : false;
}

export function toggleMyList(
  item: any,
  mediaType: 'movie' | 'tv' | 'dubbed' = 'movie'
): { added: boolean; list: MyListItem[] } {
  ensureLoaded();
  const list = [...(cachedList || [])];
  const idx = list.findIndex((i: any) => String(i.id) === String(item.id));

  let added = false;
  if (idx > -1) {
    list.splice(idx, 1);
    added = false;
  } else {
    list.push({
      id: item.id,
      media_type: mediaType === 'dubbed' ? 'movie' : (mediaType as 'movie' | 'tv'),
      title: item.title || item.name || '',
      poster_path: item.poster_path,
    });
    added = true;
  }

  cachedList = list;
  cachedIdSet = new Set(list.map((i: any) => i.id));

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('myList', JSON.stringify(list));
    }
  } catch (err) {
    console.warn('localStorage quota exceeded while saving myList:', err);
  }

  // Notify all components in O(1)
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }

  return { added, list };
}

export function subscribeMyList(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key === 'myList') {
      cachedList = null;
      cachedIdSet = null;
      subscribers.forEach((cb) => cb());
    }
  });
}
