import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CATEGORIES, IMAGES, PRODUCTS, normalizeSeason } from '../data/products';
import { api } from '../lib/api';
import { readStorefrontCache, writeStorefrontCache } from '../lib/storefrontCache';

// D1 is authoritative; public reads use versioned snapshots and admin reads stay uncached.
const ADMIN_KEY = 'mv_admin';

const DEFAULT_AD_BANNERS = [
  {
    id: 'default-new-season',
    name: "Men's Style — Up to 50% Off",
    src: `${import.meta.env.BASE_URL}ads/new-season.jpg`,
    active: true,
    eyebrow: 'THE MENSWEAR SALE',
    headline: 'UP TO 50% OFF',
    subtext: 'Fresh looks. Better prices.',
  },
  {
    id: 'default-selected-styles',
    name: "Men's Store — Extra 20% Off",
    src: `${import.meta.env.BASE_URL}ads/selected-styles.jpg`,
    active: true,
    eyebrow: 'SELECTED MENSWEAR',
    headline: 'EXTRA 20% OFF',
    subtext: 'Find your next everyday favorite.',
  },
  {
    id: 'default-knitwear-edit',
    name: "Men's Essentials — Sale",
    src: `${import.meta.env.BASE_URL}ads/knitwear-edit.jpg`,
    active: true,
    eyebrow: 'THE NEW MENSWEAR EDIT',
    headline: 'GOOD STYLE. BETTER PRICES.',
    subtext: 'Shop the latest men’s essentials.',
  },
];

// Admin identity lives in D1 (email + PBKDF2 hash). The signed session cookie
// is issued by /api/auth/login — no client-side credentials anymore.

// Fallback while the API loads or is unreachable. A fresh D1 catalog is empty
// until the admin adds products or imports an initial catalog.
const initialProducts = JSON.parse(JSON.stringify(PRODUCTS));

const normalizeCategory = (category) => ({
  ...category,
  image: typeof category.image === 'string' && category.image
    ? category.image
    : IMAGES.categories[category.id] || IMAGES.banner,
});

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  // Session comes from the signed httpOnly cookie; the sessionStorage flag is
  // only a fast hint so the admin UI doesn't flash the login screen.
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_KEY) === '1';
    } catch { return false; }
  });

  const [categories, setCategories] = useState(() => CATEGORIES.map(normalizeCategory));
  const [isCategoryReordering, setIsCategoryReordering] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [shopAds, setShopAds] = useState({ enabled: true, banners: DEFAULT_AD_BANNERS });
  const [heroImage, setHeroImage] = useState('');
  const [status, setStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [hiddenSeasons, setHiddenSeasons] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const initialAdminHint = useRef(isLoggedIn);
  const publicCacheReady = useRef(false);
  const catalogVersion = useRef(null);
  const publicRefresh = useRef(null);

  const applyStorefrontSnapshot = useCallback((snapshot, verified = false) => {
    if (
      !snapshot ||
      !/^\d+$/.test(String(snapshot.version)) ||
      !Array.isArray(snapshot.products) ||
      !Array.isArray(snapshot.categories) ||
      !Array.isArray(snapshot.ads?.banners)
    ) {
      throw new Error('The storefront catalog snapshot is invalid.');
    }
    catalogVersion.current = String(snapshot.version);
    setProducts(snapshot.products);
    if (snapshot.categories.length) {
      setCategories(snapshot.categories.map(normalizeCategory));
    }
    setShopAds({ enabled: snapshot.ads.enabled !== false, banners: snapshot.ads.banners });
    setHiddenSeasons(snapshot.settings?.hiddenSeasons || {});
    setHeroImage(snapshot.settings?.heroImage || '');
    if (verified) setCatalogLoaded(true);
  }, []);

  const refreshStoreData = useCallback(async () => {
    const [catalog, catData, adsData, settingsData] = await Promise.all([
      api('/api/products'),
      api('/api/categories').catch(() => ({ categories: null })),
      api('/api/ads').catch(() => null),
      api('/api/settings').catch(() => ({ settings: null })),
    ]);
    setProducts(Array.isArray(catalog.products) ? catalog.products : []);
    setCatalogLoaded(true);
    if (catData.categories?.length) setCategories(catData.categories.map(normalizeCategory));
    if (adsData && Array.isArray(adsData.banners)) {
      setShopAds({ enabled: adsData.enabled !== false, banners: adsData.banners });
    }
    setHiddenSeasons(settingsData?.settings?.hiddenSeasons || {});
    setHeroImage(settingsData?.settings?.heroImage || '');
  }, []);

  const refreshPublicStoreData = useCallback(async () => {
    if (publicRefresh.current) return publicRefresh.current;
    const pending = (async () => {
      let knownVersion = catalogVersion.current;
      for (let attempt = 0; attempt < 2; attempt++) {
        const versionData = await api('/api/storefront/version', {
          headers: knownVersion === null ? undefined : { 'if-none-match': `"${knownVersion}"` },
        });
        if (versionData.notModified) {
          setCatalogLoaded(true);
          return;
        }
        const version = String(versionData.version);
        if (!/^\d+$/.test(version)) throw new Error('The storefront version response is invalid.');
        if (version === knownVersion) {
          setCatalogLoaded(true);
          return;
        }

        try {
          const snapshot = await api(`/api/storefront/catalog?version=${encodeURIComponent(version)}`);
          if (String(snapshot.version) !== version) {
            const error = new Error('The storefront catalog changed during refresh.');
            error.status = 409;
            throw error;
          }
          applyStorefrontSnapshot(snapshot, true);
          try {
            await writeStorefrontCache(snapshot);
          } catch (error) {
            console.warn('Could not persist the storefront cache:', error?.message);
          }
          return;
        } catch (error) {
          if (error.status !== 409 || attempt === 1) throw error;
          knownVersion = null;
        }
      }
    })();
    publicRefresh.current = pending;
    try {
      await pending;
    } finally {
      if (publicRefresh.current === pending) publicRefresh.current = null;
    }
  }, [applyStorefrontSnapshot]);

  const hydratePublicCache = useCallback(async () => {
    try {
      const cached = await readStorefrontCache();
      if (cached) applyStorefrontSnapshot(cached);
    } catch (error) {
      console.warn('Could not read the storefront cache:', error?.message);
    } finally {
      publicCacheReady.current = true;
    }
  }, [applyStorefrontSnapshot]);

  const hydratePublicStoreData = useCallback(async () => {
    await hydratePublicCache();
    await refreshPublicStoreData();
  }, [hydratePublicCache, refreshPublicStoreData]);

  const apiError = useCallback((e) => {
    console.error('API request failed:', e?.message);
    setStatus('error');
    setStatusMsg('admin.toastSaveFailed');
    // Reconcile optimistic UI changes with the server after a failed save.
    refreshStoreData().catch((refreshError) => {
      console.error('Unable to restore server data:', refreshError?.message);
    });
  }, [refreshStoreData]);

  // --- initial load from the server ---
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cacheHydration = initialAdminHint.current
          ? Promise.resolve()
          : hydratePublicCache();
        const me = await api('/api/auth/me').catch(() => null);
        if (!alive) return;
        setIsLoggedIn(!!me?.admin);
        if (!me?.admin) {
          try { sessionStorage.removeItem(ADMIN_KEY); } catch {}
        }
        if (me?.admin) {
          await cacheHydration;
          await refreshStoreData();
        }
        else if (initialAdminHint.current) await hydratePublicStoreData();
        else {
          await cacheHydration;
          await refreshPublicStoreData();
        }
        if (!alive) return;
      } catch (e) {
        console.error('Catalog load failed:', e?.message);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [refreshStoreData, hydratePublicCache, hydratePublicStoreData, refreshPublicStoreData]);

  useEffect(() => {
    if (isLoggedIn) return undefined;
    let timer;
    const refreshIfVisible = () => {
      if (publicCacheReady.current && document.visibilityState === 'visible') {
        clearTimeout(timer);
        timer = setTimeout(() => {
          refreshPublicStoreData().catch((error) => {
            console.error('Storefront refresh failed:', error?.message);
          });
        }, 150);
      }
    };
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [isLoggedIn, refreshPublicStoreData]);

  const addCategory = useCallback((category) => {
    if (
      !category ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.id) ||
      !category.label?.trim() ||
      !category.labelAr?.trim() ||
      categories.some((item) => item.id === category.id)
    ) {
      setStatus('error');
      setStatusMsg('admin.toastCategoryInvalid');
      return false;
    }
    const doc = {
      ...category,
      label: category.label.trim(),
      labelAr: category.labelAr.trim(),
      image: category.image || IMAGES.banner,
    };
    setCategories((prev) => [...prev, doc]);
    setStatus('success');
    setStatusMsg('admin.toastCategoryAdded');
    api('/api/categories', { method: 'POST', body: doc })
      .catch(apiError);
    return true;
  }, [categories, apiError]);

  const updateCategory = useCallback((id, updates) => {
    if (!categories.some((category) => category.id === id)) return false;
    if (!updates.label?.trim() || !updates.labelAr?.trim()) {
      setStatus('error');
      setStatusMsg('admin.toastCategoryNamesRequired');
      return false;
    }
    setCategories((prev) => prev.map((category) => (
      category.id === id
        ? { ...category, label: updates.label.trim(), labelAr: updates.labelAr.trim(), image: updates.image || category.image }
        : category
    )));
    setStatus('success');
    setStatusMsg('admin.toastCategoryUpdated');
    api(`/api/categories/${id}`, { method: 'PUT', body: updates })
      .catch(apiError);
    return true;
  }, [categories, apiError]);

  const deleteCategory = useCallback((id) => {
    if (products.some((product) => product.category === id)) {
      setStatus('error');
      setStatusMsg('admin.toastCategoryHasProducts');
      return false;
    }
    if (categories.length <= 1) {
      setStatus('error');
      setStatusMsg('admin.toastCategoryKeepOne');
      return false;
    }
    setCategories((prev) => prev.filter((category) => category.id !== id));
    setStatus('success');
    setStatusMsg('admin.toastCategoryDeleted');
    api(`/api/categories/${id}`, { method: 'DELETE' })
      .catch(apiError);
    return true;
  }, [categories, products, apiError]);

  const moveCategory = useCallback(async (id, direction) => {
    if (isCategoryReordering) return false;
    const index = categories.findIndex((category) => category.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return false;

    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setIsCategoryReordering(true);
    setCategories(reordered);
    try {
      await api('/api/categories/reorder', {
        method: 'PUT',
        body: { ids: reordered.map((category) => category.id) },
      });
      setStatus('success');
      setStatusMsg('admin.toastCategoryOrderUpdated');
      return true;
    } catch (error) {
      const previousIds = categories.map((category) => category.id);
      setCategories((current) => {
        const byId = new Map(current.map((category) => [category.id, category]));
        const ordered = previousIds.map((categoryId) => byId.get(categoryId)).filter(Boolean);
        const included = new Set(previousIds);
        return [...ordered, ...current.filter((category) => !included.has(category.id))];
      });
      apiError(error);
      return false;
    } finally {
      setIsCategoryReordering(false);
    }
  }, [apiError, categories, isCategoryReordering]);

  const login = useCallback(async (email, password) => {
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      setIsLoggedIn(true);
      try { sessionStorage.setItem(ADMIN_KEY, '1'); } catch {}
    } catch {
      return false;
    }
    try {
      await refreshStoreData();
    } catch (error) {
      apiError(error);
    }
    return true;
  }, [apiError, refreshStoreData]);

  const logout = useCallback(async () => {
    setIsLoggedIn(false);
    try { sessionStorage.removeItem(ADMIN_KEY); } catch {}
    api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    hydratePublicStoreData().catch((error) => {
      console.error('Storefront refresh after logout failed:', error?.message);
    });
  }, [hydratePublicStoreData]);

  const addProduct = useCallback(async (product) => {
    try {
      const data = await api('/api/products', { method: 'POST', body: product });
      setProducts((prev) => [data.product || product, ...prev]);
      setStatus('success');
      setStatusMsg('admin.toastProductCreated');
      return data.product || product;
    } catch (error) {
      apiError(error);
      throw error;
    }
  }, [apiError]);

  const updateProduct = useCallback(async (id, updated) => {
    const prev = products.find((p) => p.id === id) || {};
    try {
      const data = await api(`/api/products/${id}`, { method: 'PUT', body: { ...prev, ...updated, id } });
      const saved = data.product || { ...prev, ...updated, id };
      setProducts((list) => list.map((p) => (p.id === id ? saved : p)));
      setStatus('success');
      setStatusMsg('admin.toastProductSaved');
      return saved;
    } catch (error) {
      apiError(error);
      throw error;
    }
  }, [products, apiError]);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.length ? prev.filter((p) => p.id !== id) : prev);
    setStatus('success');
    setStatusMsg('admin.toastProductDeleted');
    api(`/api/products/${id}`, { method: 'DELETE' })
      .catch(apiError);
    return true;
  }, [apiError]);

  const toggleProductActive = useCallback((id) => {
    const current = products.find((p) => p.id === id);
    const nextActive = current?.active === false;
    setProducts((prev) => prev.map((p) =>
      p.id === id ? { ...p, active: nextActive } : p
    ));
    setStatus('success');
    setStatusMsg('admin.toastProductStatusUpdated');
    api(`/api/products/${id}`, { method: 'PUT', body: { ...current, active: nextActive, id } })
      .catch(apiError);
    return true;
  }, [products, apiError]);

  const saveShopAds = useCallback((nextAds, message) => {
    setShopAds(nextAds);
    setStatus('success');
    setStatusMsg(message);
    api('/api/ads', { method: 'PUT', body: nextAds })
      .catch(apiError);
    return true;
  }, [apiError]);

  const addAdBanners = useCallback((banners) => {
    saveShopAds({ ...shopAds, banners: [...shopAds.banners, ...banners] }, 'admin.toastAdImagesAdded');
  }, [saveShopAds, shopAds]);

  const toggleShopAds = useCallback(() => {
    const enabled = !shopAds.enabled;
    saveShopAds({ ...shopAds, enabled }, enabled ? 'admin.toastAdAreaShown' : 'admin.toastAdAreaHidden');
  }, [saveShopAds, shopAds]);

  const toggleAdBanner = useCallback((id) => {
    const banners = shopAds.banners.map((banner) =>
      banner.id === id ? { ...banner, active: banner.active === false } : banner
    );
    saveShopAds({ ...shopAds, banners }, 'admin.toastAdVisibilityUpdated');
  }, [saveShopAds, shopAds]);

  const deleteAdBanner = useCallback((id) => {
    const banners = shopAds.banners.filter((banner) => banner.id !== id);
    saveShopAds({ ...shopAds, banners }, 'admin.toastAdDeleted');
  }, [saveShopAds, shopAds]);

  const moveAdBanner = useCallback((id, direction) => {
    const index = shopAds.banners.findIndex((banner) => banner.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= shopAds.banners.length) return;
    const banners = [...shopAds.banners];
    [banners[index], banners[target]] = [banners[target], banners[index]];
    saveShopAds({ ...shopAds, banners }, 'admin.toastAdOrderUpdated');
  }, [saveShopAds, shopAds]);

  const toggleSeasonVisibility = useCallback((season) => {
    const hidden = !hiddenSeasons[season];
    const next = { ...hiddenSeasons, [season]: hidden };
    setHiddenSeasons(next);
    setStatus('success');
    setStatusMsg(hidden
      ? `admin.toast${season === 'winter' ? 'Winter' : 'Summer'}Hidden`
      : `admin.toast${season === 'winter' ? 'Winter' : 'Summer'}Visible`);
    api('/api/settings', { method: 'PUT', body: { hiddenSeasons: next } })
      .catch(apiError);
  }, [hiddenSeasons, apiError]);

  const updateHeroImage = useCallback(async (image) => {
    try {
      await api('/api/settings', { method: 'PUT', body: { heroImage: image } });
      setHeroImage(image);
      setStatus('success');
      setStatusMsg('admin.toastHeroImageSaved');
    } catch (error) {
      apiError(error);
      throw error;
    }
  }, [apiError]);

  const isSeasonHidden = useCallback(
    (season) => !!hiddenSeasons[normalizeSeason(season)],
    [hiddenSeasons]
  );

  const clearStatus = useCallback(() => {
    setStatus(null);
    setStatusMsg('');
  }, []);

  const value = {
    isLoggedIn,
    login,
    logout,
    loaded,
    catalogLoaded,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    isCategoryReordering,
    products,
    shopAds,
    heroImage,
    updateHeroImage,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    addAdBanners,
    toggleShopAds,
    toggleAdBanner,
    deleteAdBanner,
    moveAdBanner,
    toggleSeasonVisibility,
    isSeasonHidden,
    hiddenSeasons,
    status,
    statusMsg,
    clearStatus,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};
