import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Maintenance from './pages/Maintenance';
import FloatingDonate from './components/ui/FloatingDonate';
import { useCMSData } from './hooks/useCMSData';

// Lazy wrapper with auto-reload retry on fetch/network chunk failures
function safeLazy(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      console.warn('Dynamic chunk load failed. Reloading page for latest updates...', err);
      window.location.reload();
      return new Promise(() => {}); // keeps page in suspense state until reloaded
    })
  );
}

// Lazy loaded page components to code-split the public site bundle
const About = safeLazy(() => import('./pages/About'));
const Programmes = safeLazy(() => import('./pages/Programmes'));
const Gallery = safeLazy(() => import('./pages/Gallery'));
const Contact = safeLazy(() => import('./pages/Contact'));
const Donate = safeLazy(() => import('./pages/Donate'));
const Career = safeLazy(() => import('./pages/Career'));
const NotFound = safeLazy(() => import('./pages/NotFound'));
const Legal = safeLazy(() => import('./pages/Legal'));
const TaxReceipts = safeLazy(() => import('./pages/TaxReceipts'));

// Scroll restoration helper
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 160); // 160ms delay matches the 0.15s exit duration + buffer
    return () => clearTimeout(timer);
  }, [pathname]);
  return null;
}

// Router-aware wrapper for AnimatePresence page transitions
function AnimatedRoutes() {
  const location = useLocation();
  const settings = useCMSData('settings');
  const navigation = settings?.navigation || [];

  const isRouteActive = (path) => {
    if (navigation.length === 0) return true;
    const item = navigation.find(n => n.path === path);
    return item ? item.active !== false : true;
  };

  React.useEffect(() => {
    const siteName = settings?.general?.siteName || 'Lakshya';
    const path = location.pathname;
    
    if (path === '/') {
      document.title = settings?.seo?.metaTitle || `${siteName} — Society for Social & Environmental Development`;
    } else if (path === '/about') {
      document.title = `About Us | ${siteName}`;
    } else if (path === '/programmes') {
      document.title = `Our Programmes | ${siteName}`;
    } else if (path === '/gallery') {
      document.title = `Media Gallery | ${siteName}`;
    } else if (path === '/contact') {
      document.title = `Contact Us | ${siteName}`;
    } else if (path === '/donate') {
      document.title = `Donate & Support | ${siteName}`;
    } else if (path === '/career') {
      document.title = `Careers | ${siteName}`;
    } else if (path === '/tax-receipts' || path === '/receipt-lookup') {
      document.title = `80G Tax Receipts & Statement | ${siteName}`;
    } else if (path === '/privacy-policy') {
      document.title = `Privacy Policy | ${siteName}`;
    } else if (path === '/terms-conditions') {
      document.title = `Terms & Conditions | ${siteName}`;
    } else if (path === '/refund-policy') {
      document.title = `Refund Policy | ${siteName}`;
    } else if (path === '/cancellation-policy') {
      document.title = `Cancellation Policy | ${siteName}`;
    } else {
      document.title = `Not Found | ${siteName}`;
    }
  }, [location.pathname, settings]);

  const isMaintenance = settings?.advanced?.maintenanceMode === true;
  const maintenanceScope = settings?.advanced?.maintenanceScope || 'all';
  const maintenancePages = Array.isArray(settings?.advanced?.maintenancePages) ? settings?.advanced?.maintenancePages : [];

  const isPageUnderMaintenance = (routePath) => {
    if (!isMaintenance) return false;
    if (maintenanceScope === 'all') return true;

    const normalized = (routePath || '/').toLowerCase().trim();
    return maintenancePages.some((p) => {
      const cleanP = (p || '').toLowerCase().trim();
      if (!cleanP) return false;
      if (cleanP === normalized) return true;
      if (cleanP === '/legal' && (normalized === '/privacy-policy' || normalized === '/terms-conditions')) return true;
      return false;
    });
  };

  const isHomeUnderMaintenance = isPageUnderMaintenance('/');

  const renderRoute = (routePath, element, activeCheck) => {
    if (isPageUnderMaintenance(routePath)) {
      const shouldAutoRedirectToHome = (
        maintenanceScope === 'selective' &&
        routePath !== '/' &&
        !isHomeUnderMaintenance
      );

      return (
        <Maintenance 
          message={settings?.advanced?.maintenanceMessage}
          logoSrc={settings?.general?.logoDark || settings?.general?.logoLight}
          autoRedirectToHome={shouldAutoRedirectToHome}
        />
      );
    }
    if (activeCheck && !isRouteActive(routePath)) {
      return <Navigate to="/" replace />;
    }
    return element;
  };

  return (
    <AnimatePresence mode="wait">
      <React.Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-forest-600 font-sans font-medium text-sm">Loading...</div>}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={renderRoute('/', <Home />)} />
          <Route path="/about" element={renderRoute('/about', <About />, true)} />
          <Route path="/programmes" element={renderRoute('/programmes', <Programmes />, true)} />
          <Route path="/gallery" element={renderRoute('/gallery', <Gallery />, true)} />
          <Route path="/contact" element={renderRoute('/contact', <Contact />, true)} />
          <Route path="/donate" element={renderRoute('/donate', <Donate />)} />
          <Route path="/career" element={renderRoute('/career', <Career />, true)} />
          <Route path="/tax-receipts" element={renderRoute('/tax-receipts', <TaxReceipts />)} />
          <Route path="/receipt-lookup" element={renderRoute('/tax-receipts', <TaxReceipts />)} />
          <Route path="/privacy-policy" element={renderRoute('/privacy-policy', <Legal type="privacyPolicy" />)} />
          <Route path="/terms-conditions" element={renderRoute('/terms-conditions', <Legal type="termsConditions" />)} />
          <Route path="/refund-policy" element={renderRoute('/refund-policy', <Legal type="refundPolicy" />)} />
          <Route path="/cancellation-policy" element={renderRoute('/cancellation-policy', <Legal type="cancellationPolicy" />)} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </React.Suspense>
    </AnimatePresence>
  );
}

function App() {
  const settings = useCMSData('settings');
  const isMaintenance = settings?.advanced?.maintenanceMode === true;
  const maintenanceScope = settings?.advanced?.maintenanceScope || 'all';

  React.useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const theme = settings.theme || {};
    
    // Default Fallbacks
    const primary = theme.primaryColor || '#2e7d32';
    const accent = theme.accentColor || '#f5a623';
    
    const adjustColorBrightness = (hex, percent) => {
      let R = parseInt(hex.substring(1, 3), 16);
      let G = parseInt(hex.substring(3, 5), 16);
      let B = parseInt(hex.substring(5, 7), 16);

      R = parseInt((R * (100 + percent)) / 100);
      G = parseInt((G * (100 + percent)) / 100);
      B = parseInt((B * (100 + percent)) / 100);

      R = R < 255 ? R : 255;
      G = G < 255 ? G : 255;
      B = B < 255 ? B : 255;

      R = R > 0 ? R : 0;
      G = G > 0 ? G : 0;
      B = B > 0 ? B : 0;

      const rHex = R.toString(16).padStart(2, '0');
      const gHex = G.toString(16).padStart(2, '0');
      const bHex = B.toString(16).padStart(2, '0');

      return `#${rHex}${gHex}${bHex}`;
    };

    const primaryDark = adjustColorBrightness(primary, -20);
    const primaryDarker = adjustColorBrightness(primary, -35);
    const primaryLight = adjustColorBrightness(primary, 60);
    const primaryLightest = adjustColorBrightness(primary, 85);

    const accentDark = adjustColorBrightness(accent, -20);
    const accentLight = adjustColorBrightness(accent, 40);

    // Apply variables to root style
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-dark', primaryDark);
    root.style.setProperty('--color-primary-darker', primaryDarker);
    root.style.setProperty('--color-primary-light', primaryLight);
    root.style.setProperty('--color-primary-lightest', primaryLightest);

    root.style.setProperty('--color-accent', accent);
    root.style.setProperty('--color-accent-dark', accentDark);
    root.style.setProperty('--color-accent-light', accentLight);

    // Apply dark class
    if (theme.darkMode === true) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings]);

  if (isMaintenance && maintenanceScope === 'all') {
    return (
      <Maintenance 
        message={settings?.advanced?.maintenanceMessage}
        logoSrc={settings?.general?.logoDark || settings?.general?.logoLight}
      />
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <FloatingDonate />
      <div className="flex flex-col min-h-screen bg-cream text-charcoal font-sans select-none">
        <Navbar />
        <main className="flex-grow">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
