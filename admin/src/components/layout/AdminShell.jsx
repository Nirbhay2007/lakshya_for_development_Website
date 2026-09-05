import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAdminStore } from '../../store/useAdminStore';
import { syncAllSections } from '../../store/dataSync';

export default function AdminShell() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = useAdminStore((state) => state.isAuthenticated);
  const updateActivity = useAdminStore((state) => state.updateActivity);
  const initMedia = useAdminStore((state) => state.initMedia);
  const clearUnsaved = useAdminStore((state) => state.clearUnsaved);
  const lockSecurity = useAdminStore((state) => state.lockSecurity);

  // Initialize media settings and sync CMS data from server
  useEffect(() => {
    initMedia();
    // Pre-fetch all CMS sections from server into localStorage cache
    syncAllSections();
  }, []);

  // Clear unsaved changes and lock security keys instantly on route transitions
  useEffect(() => {
    clearUnsaved();
    lockSecurity();
  }, [location.pathname, clearUnsaved, lockSecurity]);

  // Update activity timestamp on page view / interaction
  useEffect(() => {
    updateActivity();

    // Listen to user interactions to extend the session
    const handleUserActivity = () => {
      updateActivity();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    // Periodic check every 10 seconds to verify if the session has expired
    const interval = setInterval(() => {
      updateActivity();
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(interval);
    };
  }, [location.pathname, updateActivity]);

  // Protect Admin Routes
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-admin-bg text-admin-text flex relative">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={isMobileSidebarOpen} setIsOpen={setIsMobileSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-[260px] flex flex-col min-w-0 w-full">
        {/* Top Header */}
        <TopBar onMenuClick={() => setIsMobileSidebarOpen(true)} />

        {/* Scrollable Viewport */}
        <main className="flex-1 pt-[72px] pb-24 px-4 md:px-8 max-w-6xl w-full mx-auto overflow-y-auto max-h-[100vh]">
          <React.Suspense fallback={<div className="text-center py-12 text-admin-muted text-sm font-sans">Loading editor...</div>}>
            <Outlet />
          </React.Suspense>
        </main>
      </div>
    </div>
  );
}
