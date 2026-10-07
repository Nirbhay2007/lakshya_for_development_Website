import { useState, useEffect } from 'react';
import { normalizeData } from '../../../shared/normalizeData';

// Static fallbacks (used when API is unreachable — e.g., during build or offline)
import heroFallback from '../../../shared/data/hero.json';
import eventsFallback from '../../../shared/data/events.json';
import aboutFallback from '../../../shared/data/about.json';
import programmesFallback from '../../../shared/data/programmes.json';
import impactFallback from '../../../shared/data/impact.json';
import galleryFallback from '../../../shared/data/gallery.json';
import partnersFallback from '../../../shared/data/partners.json';
import teamFallback from '../../../shared/data/team.json';
import contactFallback from '../../../shared/data/contact.json';
import donateFallback from '../../../shared/data/donate.json';
import settingsFallback from '../../../shared/data/settings.json';
import careersFallback from '../../../shared/data/careers.json';
import legalFallback from '../../../shared/data/legal.json';

const fallbacks = {
  hero: heroFallback,
  events: eventsFallback,
  about: aboutFallback,
  programmes: programmesFallback,
  impact: impactFallback,
  gallery: galleryFallback,
  partners: partnersFallback,
  team: teamFallback,
  contact: contactFallback,
  donate: donateFallback,
  settings: settingsFallback,
  careers: careersFallback,
  legal: legalFallback
};

// Module-level cache for the bulk data fetch promise and resolved data
let bulkDataPromise = null;
let cachedData = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds max TTL to coalesce concurrent mounts without serving stale data

export function invalidateCMSCache(section) {
  cachedData = null;
  bulkDataPromise = null;
  lastFetchTime = 0;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lakshya_cms_cache_invalidated', { detail: { section } }));
  }
}

async function fetchBulkCMSData(force = false) {
  const now = Date.now();
  if (!force && cachedData && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedData;
  }
  if (!force && bulkDataPromise) {
    return bulkDataPromise;
  }

  bulkDataPromise = (async () => {
    try {
      const response = await fetch(`/api/cms?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (response.ok) {
        const json = await response.json();
        cachedData = json;
        lastFetchTime = Date.now();
        return json;
      }
    } catch (e) {
      console.warn('API bulk retrieve failed, will fall back to individual section calls.', e);
    } finally {
      bulkDataPromise = null;
    }
    return null;
  })();

  return bulkDataPromise;
}

export function useCMSData(section) {
  // Initialize with localStorage draft (if on same domain) -> injected SSR data -> static fallback
  const [data, setData] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(`lakshya_cms_${section}`);
        if (local) {
          return normalizeData(section, JSON.parse(local));
        }
      } catch (e) {}

      if (window.__CMS_DATA__ && window.__CMS_DATA__[section] !== undefined) {
        return normalizeData(section, window.__CMS_DATA__[section]);
      }
    }
    return normalizeData(section, fallbacks[section]);
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchLive(force = false) {
      const bulk = await fetchBulkCMSData(force);
      if (cancelled) return;

      if (bulk && bulk[section] !== undefined) {
        const normalized = normalizeData(section, bulk[section]);
        setData(normalized);
        if (typeof window !== 'undefined') {
          if (!window.__CMS_DATA__) window.__CMS_DATA__ = {};
          window.__CMS_DATA__[section] = bulk[section];
        }
      } else {
        // Fallback to individual request if bulk fetch failed or didn't contain the section
        try {
          const response = await fetch(`/api/cms/${section}?t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
          });
          if (response.ok && !cancelled) {
            const serverData = await response.json();
            const normalized = normalizeData(section, serverData);
            setData(normalized);
            if (typeof window !== 'undefined') {
              if (!window.__CMS_DATA__) window.__CMS_DATA__ = {};
              window.__CMS_DATA__[section] = serverData;
            }
          }
        } catch {
          console.warn(`API unavailable for "${section}", using bundled fallback.`);
        }
      }
    }

    fetchLive(false);

    // Cross-tab storage updates
    const handleStorage = (e) => {
      if (e.key === `lakshya_cms_${section}`) {
        invalidateCMSCache(section);
        if (e.newValue) {
          try {
            setData(normalizeData(section, JSON.parse(e.newValue)));
          } catch (err) {}
        } else {
          fetchLive(true);
        }
      }
    };

    // Same-window custom event updates
    const handleCustomUpdate = () => {
      invalidateCMSCache(section);
      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem(`lakshya_cms_${section}`);
          if (local) {
            setData(normalizeData(section, JSON.parse(local)));
            return;
          }
        } catch (e) {}
      }
      fetchLive(true);
    };

    // Auto-refresh when user switches back to this tab/window
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidateCMSCache(section);
        fetchLive(true);
      }
    };

    const handleFocus = () => {
      invalidateCMSCache(section);
      fetchLive(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      window.addEventListener(`lakshya_cms_${section}_update`, handleCustomUpdate);
      window.addEventListener('lakshya_cms_update', handleCustomUpdate);
      window.addEventListener('lakshya_cms_cache_invalidated', handleCustomUpdate);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(`lakshya_cms_${section}_update`, handleCustomUpdate);
        window.removeEventListener('lakshya_cms_update', handleCustomUpdate);
        window.removeEventListener('lakshya_cms_cache_invalidated', handleCustomUpdate);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [section]);

  return data;
}
