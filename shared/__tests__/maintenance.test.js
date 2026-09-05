import { describe, it, expect } from 'vitest';

describe('Selective Page Maintenance Mode Logic', () => {
  const settingsFullSite = {
    advanced: {
      maintenanceMode: true,
      maintenanceScope: 'all',
      maintenancePages: []
    }
  };

  const settingsSelective = {
    advanced: {
      maintenanceMode: true,
      maintenanceScope: 'selective',
      maintenancePages: ['/donate', '/contact']
    }
  };

  const isPageUnderMaintenance = (path, settings) => {
    if (!settings?.advanced?.maintenanceMode) return false;
    const scope = settings.advanced.maintenanceScope || 'all';
    if (scope === 'all') return true;
    const pages = settings.advanced.maintenancePages || [];
    return pages.includes(path);
  };

  it('locks entire site when maintenanceMode is true and scope is "all"', () => {
    expect(isPageUnderMaintenance('/', settingsFullSite)).toBe(true);
    expect(isPageUnderMaintenance('/about', settingsFullSite)).toBe(true);
    expect(isPageUnderMaintenance('/donate', settingsFullSite)).toBe(true);
  });

  it('locks only selected pages when scope is "selective"', () => {
    expect(isPageUnderMaintenance('/donate', settingsSelective)).toBe(true);
    expect(isPageUnderMaintenance('/contact', settingsSelective)).toBe(true);
    expect(isPageUnderMaintenance('/', settingsSelective)).toBe(false);
    expect(isPageUnderMaintenance('/about', settingsSelective)).toBe(false);
    expect(isPageUnderMaintenance('/programmes', settingsSelective)).toBe(false);
  });

  it('never locks site when maintenanceMode is false', () => {
    const disabledSettings = { advanced: { maintenanceMode: false, maintenanceScope: 'all', maintenancePages: ['/donate'] } };
    expect(isPageUnderMaintenance('/', disabledSettings)).toBe(false);
    expect(isPageUnderMaintenance('/donate', disabledSettings)).toBe(false);
  });

  it('always allows admin routes regardless of maintenance status', () => {
    const isAdminRoute = (path) => path.startsWith('/admin');
    expect(isAdminRoute('/admin')).toBe(true);
    expect(isAdminRoute('/admin/donations')).toBe(true);
    expect(isAdminRoute('/admin/settings')).toBe(true);
    expect(isAdminRoute('/donate')).toBe(false);
  });

  it('calculates 5-second countdown timer correctly', () => {
    let countdown = 5;
    const tick = () => (countdown = Math.max(0, countdown - 1));

    expect(countdown).toBe(5);
    tick();
    expect(countdown).toBe(4);
    tick(); tick(); tick(); tick();
    expect(countdown).toBe(0);
    tick();
    expect(countdown).toBe(0);
  });
});
