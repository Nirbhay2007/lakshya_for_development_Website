import { useAdminStore } from './useAdminStore';
import toast from 'react-hot-toast';
import { normalizeData } from '../../../shared/normalizeData';

// Static fallbacks as default data (used when API is unreachable)
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

// ─── SYNCHRONOUS: Get data from localStorage cache or bundled fallback ───
// This keeps all existing editor code working without changes.
// On first load, returns fallback. After first API sync, returns cached server data.
export function getSectionData(sectionKey) {
  const saved = localStorage.getItem(`lakshya_cms_${sectionKey}`);
  if (saved) {
    try {
      return normalizeData(sectionKey, JSON.parse(saved));
    } catch (e) {
      console.error(`Error parsing cache for ${sectionKey}`, e);
    }
  }
  
  if (typeof window !== 'undefined' && window.__CMS_DATA__ && window.__CMS_DATA__[sectionKey]) {
    return normalizeData(sectionKey, window.__CMS_DATA__[sectionKey]);
  }
  
  return normalizeData(sectionKey, fallbacks[sectionKey]);
}

// ─── ASYNC: Fetch fresh data from server API and update localStorage cache ───
// Call this on app init or when entering an editor to ensure cache is fresh.
export async function refreshSectionData(sectionKey) {
  try {
    const store = useAdminStore.getState();
    const headers = {};
    if (store.token) {
      headers['Authorization'] = `Bearer ${store.token}`;
    }
    if (store.pinHash) {
      headers['x-cms-pin-hash'] = store.pinHash;
    }
    const response = await fetch(`/api/cms/${sectionKey}`, { headers });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem(`lakshya_cms_${sectionKey}`, JSON.stringify(data));
      return normalizeData(sectionKey, data);
    }
  } catch {
    console.warn(`API unavailable for "${sectionKey}", using cache.`);
  }
  // Return current cached version if API fails
  return getSectionData(sectionKey);
}

// Pre-fetch all sections into localStorage cache on app init
export async function syncAllSections() {
  const store = useAdminStore.getState();
  const headers = {};
  if (store.token) {
    headers['Authorization'] = `Bearer ${store.token}`;
  }
  if (store.pinHash) {
    headers['x-cms-pin-hash'] = store.pinHash;
  }
  const promises = Object.keys(fallbacks).map(async (key) => {
    try {
      const response = await fetch(`/api/cms/${key}`, {
        headers: key === 'donate' ? headers : {}
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(`lakshya_cms_${key}`, JSON.stringify(data));
      }
    } catch {
      // Silently continue — cache will serve fallback
    }
  });
  await Promise.all(promises);
}

// Save section changes — write to server API + update localStorage cache
export async function saveSection(sectionKey, data) {
  const store = useAdminStore.getState();

  // 1. Update localStorage cache immediately (instant UI update)
  localStorage.setItem(`lakshya_cms_${sectionKey}`, JSON.stringify(data));

  // 2. Dispatch custom events for same-window updates
  window.dispatchEvent(new CustomEvent(`lakshya_cms_${sectionKey}_update`));
  window.dispatchEvent(new CustomEvent('lakshya_cms_update'));

  const headers = {
    'Content-Type': 'application/json'
  };
  if (store.token) {
    headers['Authorization'] = `Bearer ${store.token}`;
  }
  if (store.pinHash) {
    headers['x-cms-pin-hash'] = store.pinHash;
  }
  if (store.securityKeyHash) {
    headers['x-cms-security-key-hash'] = store.securityKeyHash;
  }

  // 3. Save to server API
  try {
    const response = await fetch(`/api/cms/${sectionKey}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error(`Server save failed for "${sectionKey}":`, err.message || response.statusText);
      toast.error(`Failed to save ${sectionKey}: ${err.message || response.statusText}`);
    } else {
      toast.success(`${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} section saved`);
    }
  } catch (e) {
    console.error(`Network error saving "${sectionKey}":`, e.message);
    toast.error(`Network error while saving ${sectionKey}`);
  }

  // 4. Update admin store state (mark as draft, log activity)
  store.setSectionDraft(sectionKey, true);

  const fieldCount = typeof data === 'object' && data !== null ? Object.keys(data).length : 1;
  store.logActivity('Updated', sectionKey, `Saved changes with ${fieldCount} fields`);
}

// Reset section back to shared fallback file (discard drafts)
export async function discardSectionDraft(sectionKey) {
  localStorage.removeItem(`lakshya_cms_${sectionKey}`);
  window.dispatchEvent(new CustomEvent(`lakshya_cms_${sectionKey}_update`));
  window.dispatchEvent(new CustomEvent('lakshya_cms_update'));

  // Also restore the original file on server
  const fallbackData = fallbacks[sectionKey];
  const store = useAdminStore.getState();
  if (fallbackData) {
    const pinHash = store.pinHash;
    try {
      const response = await fetch(`/api/cms/${sectionKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash || ''
        },
        body: JSON.stringify(fallbackData)
      });
      if (!response.ok) {
        toast.error(`Failed to restore ${sectionKey}`);
      } else {
        toast.success(`Discarded drafts for ${sectionKey}`);
      }
    } catch (e) {
      console.warn(`Could not restore fallback on server for "${sectionKey}":`, e.message);
      toast.error(`Network error discarding drafts`);
    }
  }

  const event = new CustomEvent(`lakshya_cms_${sectionKey}_update`);
  window.dispatchEvent(event);

  store.setSectionDraft(sectionKey, false);
  store.logActivity('Deleted', sectionKey, `Discarded draft changes, reverted to original data`);
}

// Package all sections into a JSON export format
export function getAllData() {
  const data = {};
  Object.keys(fallbacks).forEach(key => {
    data[key] = getSectionData(key);
  });
  return data;
}
