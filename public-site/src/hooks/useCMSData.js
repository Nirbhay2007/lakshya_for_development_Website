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

async function fetchBulkCMSData() {
  if (cachedData) return cachedData;
  if (bulkDataPromise) return bulkDataPromise;

  bulkDataPromise = (async () => {
    try {
      const response = await fetch('/api/cms');
      if (response.ok) {
        const json = await response.json();
        cachedData = json;
        return json;
      }
    } catch (e) {
      console.warn('API bulk retrieve failed, will fall back to individual section calls.', e);
    }
    return null;
  })();

  return bulkDataPromise;
}

export function useCMSData(section) {
  // Initialize with static fallback for instant render (no loading state)
  const [data, setData] = useState(() => {
    if (typeof window !== 'undefined' && window.__CMS_DATA__ && window.__CMS_DATA__[section]) {
      return normalizeData(section, window.__CMS_DATA__[section]);
    }
    return normalizeData(section, fallbacks[section]);
  });

  useEffect(() => {
    // If we successfully used injected data, we can optionally skip the initial fetch,
    // but fetching in the background is fine for SPA navigation.
    let cancelled = false;

    // Fetch live data from server API (collapsing multiple hook mounts into a single bulk request)
    async function fetchLive() {
      const bulk = await fetchBulkCMSData();
      if (bulk && bulk[section] !== undefined && !cancelled) {
        setData(normalizeData(section, bulk[section]));
      } else if (!cancelled) {
        // Fallback to individual request if bulk fetch failed or didn't contain the section
        try {
          const response = await fetch(`/api/cms/${section}`);
          if (response.ok && !cancelled) {
            const serverData = await response.json();
            setData(normalizeData(section, serverData));
          }
        } catch {
          console.warn(`API unavailable for "${section}", using bundled fallback.`);
        }
      }
    }

    fetchLive();

    return () => {
      cancelled = true;
    };
  }, [section]);

  return data;
}
