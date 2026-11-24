import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CATEGORIES, IMAGES, PRODUCTS, normalizeSeason } from '../data/products';
import { api } from '../lib/api';

// Data now lives in D1 behind /api/*. localStorage keys are only kept to
// migrate legacy data (one time) and as a cache for the offline case.
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

// While the API loads (or when it is unreachable), the static catalog keeps
// the storefront alive. This is the same list the seeder put into D1.
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
  const [products, setProducts] = useState(initialProducts);
  const [shopAds, setShopAds] = useState({ enabled: true, banners: DEFAULT_AD_BANNERS });
  const [status, setStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [hiddenSeasons, setHiddenSeasons] = useState({});
  const [loaded, setLoaded] = useState(false);

  const apiError = useCallback((e) => {
    console.error('API request failed:', e?.message);
    setStatus('error');
    setStatusMsg('admin.toastSaveFailed');
  }, []);

  // --- initial load from the server ---
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api('/api/auth/me').catch(() => ({ admin: null }));
        if (!alive) return;
        setIsLoggedIn(!!me.admin);
        if (!me.admin) {
          try { sessionStorage.removeItem(ADMIN_KEY); } catch {}
        }
        const [catalog, catData, adsData, settingsData] = await Promise.all([
          api('/api/products'),
          api('/api/categories').catch(() => ({ categories: null })),
          api('/api/ads').catch(() => null),
          api('/api/settings').catch(() => ({ settings: null })),
        ]);
        if (!alive) return;
        setProducts(catalog.products || []);
        if (catData.categories?.length) setCategories(catData.categories.map(normalizeCategory));
        if (adsData && Array.isArray(adsData.banners)) {
          setShopAds({ enabled: adsData.enabled !== false, banners: adsData.banners });
        }
        if (settingsData?.settings?.hiddenSeasons) {
          setHiddenSeasons(settingsData.settings.hiddenSeasons);
        }
      } catch (e) {
        console.error('Catalog load failed:', e?.message);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

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

  const login = useCallback(async (email, password) => {
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      setIsLoggedIn(true);
      try { sessionStorage.setItem(ADMIN_KEY, '1'); } catch {}
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoggedIn(false);
    try { sessionStorage.removeItem(ADMIN_KEY); } catch {}
    api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  const addProduct = useCallback((product) => {
    setProducts((prev) => [product, ...prev]);
    setStatus('success');
    setStatusMsg('admin.toastProductCreated');
    api('/api/products', { method: 'POST', body: product })
      .catch(apiError);
    return true;
  }, [apiError]);

  const updateProduct = useCallback((id, updated) => {
    const prev = products.find((p) => p.id === id) || {};
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    setStatus('success');
    setStatusMsg('admin.toastProductSaved');
    api(`/api/products/${id}`, { method: 'PUT', body: { ...prev, ...updated, id } })
      .catch(apiError);
    return true;
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
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    products,
    shopAds,
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