import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminShell from './components/layout/AdminShell';
import Login from './pages/Login';

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
          element: <HeroEditor />
        },
        {
          path: 'events',
          element: <EventsEditor />
        },
        {
          path: 'about',
          element: <AboutEditor />
        },
        {
          path: 'programmes',
          element: <ProgrammesEditor />
        },
        {
          path: 'impact',
          element: <ImpactEditor />
        },
        {
          path: 'gallery',
          element: <GalleryEditor />
        },
        {
          path: 'partners',
          element: <PartnersEditor />
        },
        {
          path: 'team',
          element: <TeamEditor />
        },
        {
          path: 'contact',
          element: <ContactEditor />
        },
        {
          path: 'donate',
          element: <DonateEditor />
        },
        {
          path: 'careers',
          element: <CareersEditor />
        },
        {
          path: 'legal',
          element: <LegalEditor />
        },
        {
          path: 'submissions',
          element: <Submissions />
        },
        {
          path: 'donations',
          element: <Donations />
        },
        {
          path: 'settings',
          element: <SiteSettingsEditor />
        },
        {
          path: 'media',
          element: <MediaLibrary />
        },
        {
          path: 'activity',
          element: <ActivityLog />
        },
        {
          path: 'backups',
          element: <Backups />
        },
        {
          path: 'newsletter',
          element: <Newsletter />
        },
        {
          path: 'security',
          element: <SecuritySettings />
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
