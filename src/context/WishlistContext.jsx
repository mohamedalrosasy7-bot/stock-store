import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [storedIds, setStoredIds] = useLocalStorage('mv-wishlist', []);
  // Validate against the live catalog so admin-created products can be saved too.
  const { products, catalogLoaded } = useAdmin();
  const validIds = useMemo(() => new Set(products.map((p) => p.id)), [products]);

  // Keep saved ids until the live catalog is available for validation.
  const ids = useMemo(
    () => {
      const savedIds = Array.isArray(storedIds) ? storedIds : [];
      return catalogLoaded ? savedIds.filter((id) => validIds.has(id)) : savedIds;
    },
    [storedIds, validIds, catalogLoaded]
  );

  useEffect(() => {
    if (!catalogLoaded) return;
    if (ids.length !== (Array.isArray(storedIds) ? storedIds.length : 0)) setStoredIds(ids);
  }, [catalogLoaded, ids, storedIds, setStoredIds]);

  const toggle = useCallback(
    (id) => {
      if (!validIds.has(id)) return;
      setStoredIds((prev) => {
        const clean = Array.isArray(prev) ? prev.filter((x) => validIds.has(x)) : [];
        return clean.includes(id) ? clean.filter((x) => x !== id) : [...clean, id];
      });
    },
    [setStoredIds, validIds]
  );

  const value = useMemo(() => ({ ids, toggle, has: (id) => ids.includes(id) }), [ids, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
