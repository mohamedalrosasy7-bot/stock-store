import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import { PageLoader } from './components/Loaders';
import { useAdmin } from './context/AdminContext';
import Home from './pages/Home';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminProductForm from './pages/AdminProductForm';
import AdminAds from './pages/AdminAds';
import AdminCategories from './pages/AdminCategories';
import AdminOrders from './pages/AdminOrders';

const Shop = lazy(() => import('./pages/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const NotFound = lazy(() => import('./pages/NotFound'));

function AdminGuard({ children }) {
  const { isLoggedIn } = useAdmin();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoggedIn) navigate('/admin/login', { replace: true });
  }, [isLoggedIn, navigate]);
  if (!isLoggedIn) return null;
  return children;
}

function AdminRoute({ children }) {
  return <AdminLayout><AdminGuard>{children || <Outlet />}</AdminGuard></AdminLayout>;
}

function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map());
  const previousPathname = useRef(null);

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previousRestoration; };
  }, []);

  useEffect(() => {
    const key = location.key;
    const savePosition = () => scrollPositions.current.set(key, window.scrollY);
    savePosition();
    window.addEventListener('scroll', savePosition, { passive: true });
    return () => window.removeEventListener('scroll', savePosition);
  }, [location.key]);

  useLayoutEffect(() => {
    const isInitialLocation = previousPathname.current === null;
    const pathChanged = previousPathname.current !== location.pathname;

    if (isInitialLocation || pathChanged) {
      if (navigationType === 'POP') {
        window.scrollTo(0, scrollPositions.current.get(location.key) || 0);
      } else {
        window.scrollTo(0, 0);
      }
    }

    previousPathname.current = location.pathname;
  }, [location.key, location.pathname, navigationType]);

  return null;
}

function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <ScrollToTop />
      {!isAdmin && <Navbar />}
      <main>
        <Suspense fallback={<PageLoader />}>
          <div key={location.pathname} className={`page ${isAdmin ? 'page-admin' : ''}`}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order/:id" element={<OrderSuccess />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/products/add" element={<AdminProductForm />} />
                <Route path="/admin/products/edit/:id" element={<AdminProductForm />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/ads" element={<AdminAds />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <WhatsAppButton />}
    </>
  );
}

export default function App() {
  // AdminProvider now lives in main.jsx so contexts like WishlistProvider
  // can consume the live catalog (admin-created products included).
  return <AppShell />;
}