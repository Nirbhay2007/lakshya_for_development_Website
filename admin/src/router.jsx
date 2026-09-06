import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminShell from './components/layout/AdminShell';
import Login from './pages/Login';
import { useAdminStore } from './store/useAdminStore';

// Lazy wrapper with auto-reload retry on fetch/network chunk failures
function safeLazy(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      console.warn('Dynamic chunk load failed. Reloading portal for latest updates...', err);
      window.location.reload();
      return new Promise(() => {}); // keeps page in suspense state until reloaded
    })
  );
}

// RoleGuard to block direct URL access to prohibited routes
function RoleGuard({ allowedRoles = [], children }) {
  const role = useAdminStore((state) => state.role || 'superadmin');
  if (role === 'superadmin' || allowedRoles.includes(role)) {
    return children;
  }
  return <Navigate to="/" replace />;
}

// Lazy loaded page sections to split admin bundle
const Dashboard = safeLazy(() => import('./pages/Dashboard'));
const HeroEditor = safeLazy(() => import('./pages/HeroEditor'));
const EventsEditor = safeLazy(() => import('./pages/EventsEditor'));
const AboutEditor = safeLazy(() => import('./pages/AboutEditor'));
const ProgrammesEditor = safeLazy(() => import('./pages/ProgrammesEditor'));
const ImpactEditor = safeLazy(() => import('./pages/ImpactEditor'));
const GalleryEditor = safeLazy(() => import('./pages/GalleryEditor'));
const PartnersEditor = safeLazy(() => import('./pages/PartnersEditor'));
const TeamEditor = safeLazy(() => import('./pages/TeamEditor'));
const ContactEditor = safeLazy(() => import('./pages/ContactEditor'));
const DonateEditor = safeLazy(() => import('./pages/DonateEditor'));
const SiteSettingsEditor = safeLazy(() => import('./pages/SiteSettingsEditor'));
const MediaLibrary = safeLazy(() => import('./pages/MediaLibrary'));
const ActivityLog = safeLazy(() => import('./pages/ActivityLog'));
const Backups = safeLazy(() => import('./pages/Backups'));
const SecuritySettings = safeLazy(() => import('./pages/SecuritySettings'));
const CareersEditor = safeLazy(() => import('./pages/CareersEditor'));
const Newsletter = safeLazy(() => import('./pages/Newsletter'));
const LegalEditor = safeLazy(() => import('./pages/LegalEditor'));
const Submissions = safeLazy(() => import('./pages/Submissions'));
const Donations = safeLazy(() => import('./pages/Donations'));

export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <Login />
    },
    {
      path: '/',
      element: <AdminShell />,
      children: [
        {
          index: true,
          element: <Dashboard />
        },
        {
          path: 'hero',
          element: <RoleGuard allowedRoles={['editor']}><HeroEditor /></RoleGuard>
        },
        {
          path: 'events',
          element: <RoleGuard allowedRoles={['editor']}><EventsEditor /></RoleGuard>
        },
        {
          path: 'about',
          element: <RoleGuard allowedRoles={['editor']}><AboutEditor /></RoleGuard>
        },
        {
          path: 'programmes',
          element: <RoleGuard allowedRoles={['editor']}><ProgrammesEditor /></RoleGuard>
        },
        {
          path: 'impact',
          element: <RoleGuard allowedRoles={['editor']}><ImpactEditor /></RoleGuard>
        },
        {
          path: 'gallery',
          element: <RoleGuard allowedRoles={['editor']}><GalleryEditor /></RoleGuard>
        },
        {
          path: 'partners',
          element: <RoleGuard allowedRoles={['editor']}><PartnersEditor /></RoleGuard>
        },
        {
          path: 'team',
          element: <RoleGuard allowedRoles={['editor']}><TeamEditor /></RoleGuard>
        },
        {
          path: 'contact',
          element: <RoleGuard allowedRoles={['editor']}><ContactEditor /></RoleGuard>
        },
        {
          path: 'donate',
          element: <RoleGuard allowedRoles={[]}><DonateEditor /></RoleGuard>
        },
        {
          path: 'careers',
          element: <RoleGuard allowedRoles={['editor']}><CareersEditor /></RoleGuard>
        },
        {
          path: 'legal',
          element: <RoleGuard allowedRoles={['editor']}><LegalEditor /></RoleGuard>
        },
        {
          path: 'submissions',
          element: <RoleGuard allowedRoles={['editor', 'finance']}><Submissions /></RoleGuard>
        },
        {
          path: 'donations',
          element: <RoleGuard allowedRoles={['finance']}><Donations /></RoleGuard>
        },
        {
          path: 'settings',
          element: <RoleGuard allowedRoles={[]}><SiteSettingsEditor /></RoleGuard>
        },
        {
          path: 'media',
          element: <RoleGuard allowedRoles={['editor']}><MediaLibrary /></RoleGuard>
        },
        {
          path: 'activity',
          element: <RoleGuard allowedRoles={[]}><ActivityLog /></RoleGuard>
        },
        {
          path: 'backups',
          element: <RoleGuard allowedRoles={[]}><Backups /></RoleGuard>
        },
        {
          path: 'newsletter',
          element: <RoleGuard allowedRoles={['finance']}><Newsletter /></RoleGuard>
        },
        {
          path: 'security',
          element: <RoleGuard allowedRoles={[]}><SecuritySettings /></RoleGuard>
        },
        {
          path: '*',
          element: <Navigate to="/" replace />
        }
      ]
    },
    {
      path: '*',
      element: <Navigate to="/" replace />
    }
  ],
  {
    basename: '/admin'
  }
);
