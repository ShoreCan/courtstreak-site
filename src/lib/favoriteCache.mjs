export function createFavoriteCache(getStorage = () => globalThis.localStorage) {
  const key = user => `courtstreak:favorites:${user}`;
  return {
    read(user) {
      try {
        const value = JSON.parse(getStorage().getItem(key(user)) || '[]');
        return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string'))] : [];
      } catch { return []; }
    },
    write(user, keys) {
      try { getStorage().setItem(key(user), JSON.stringify(keys)); return true; }
      catch { return false; }
    },
  };
}
export const favoriteCache = createFavoriteCache();
