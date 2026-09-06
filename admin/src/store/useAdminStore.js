import { create } from 'zustand';


// Helper to load items safely from localStorage
const getJSON = (key, fallback) => {
  const val = localStorage.getItem(key);
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

export const useAdminStore = create((set, get) => ({
  isAuthenticated: false,
  isDefaultPin: false,
  securityKeyHash: null,
  isDefaultSecurityKey: false,
  lockoutUntil: null,
  wrongAttempts: 0,
  lastActivity: null,
  pinHash: null, // Stored in memory after successful login — used for API auth header
  token: null, // JWT Bearer session token
  role: localStorage.getItem('lakshya_cms_role') || 'superadmin',
  
  // Sections statuses: live / draft
  // draftFlags is an object where keys are section names and values are boolean (true = draft, false = live)
  draftFlags: getJSON('lakshya_cms_draft_flags', {}),
  
  // Unsaved changes in active forms
  unsavedSections: {}, 

  // Activity logs
  logs: [],

  // Media Library
  mediaFiles: [],

  initMedia: async () => {
    try {
      if (localStorage.getItem('lakshya_cms_media_library')) {
        localStorage.removeItem('lakshya_cms_media_library');
      }
      const response = await fetch('/api/cms/mediaFiles');
      if (response.ok) {
        const files = await response.json();
        set({ mediaFiles: Array.isArray(files) ? files : [] });
      } else {
        set({ mediaFiles: [] });
      }
    } catch (e) {
      console.error('Failed to load media files from server:', e);
      set({ mediaFiles: [] });
    }
  },

  // Auth functions
  initAuth: async () => {
    // On init, just check if server is reachable and load lockout state
    // We don't auto-login — user must enter PIN each time
    set({ isAuthenticated: false, pinHash: null, securityKeyHash: null, isDefaultSecurityKey: false });
    
    // Load media files from IndexedDB
    get().initMedia();
  },

  login: async (pin) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const result = await response.json();

      if (result.success) {
        const userRole = result.role || 'superadmin';
        localStorage.setItem('lakshya_cms_role', userRole);
        set({
          isAuthenticated: true,
          wrongAttempts: 0,
          lockoutUntil: null,
          lastActivity: Date.now(),
          isDefaultPin: result.isDefaultPin,
          pinHash: result.pinHash,
          token: result.token || null,
          role: userRole,
          isDefaultSecurityKey: result.isDefaultSecurityKey || false
        });
        await get().fetchLogs();
        await get().logActivity('Security', 'Auth', `Authorized access: user signed in with ${userRole.toUpperCase()} role`);
        return { success: true };
      } else {
        set({
          wrongAttempts: result.wrongAttempts || get().wrongAttempts + 1,
          lockoutUntil: result.lockoutUntil || null
        });

        if (result.lockoutUntil) {
          get().logActivity('Security', 'Auth', 'Admin portal locked due to failed PIN attempts');
        }

        return { success: false, message: result.message };
      }
    } catch {
      return { success: false, message: 'Server unavailable. Please try again.' };
    }
  },

  logout: () => {
    localStorage.removeItem('lakshya_cms_role');
    set({ isAuthenticated: false, lastActivity: null, pinHash: null, token: null, role: 'superadmin', securityKeyHash: null, isDefaultSecurityKey: false });
  },

  lockSecurity: () => {
    set({ securityKeyHash: null });
  },

  verifySecurityKey: async (securityKey) => {
    try {
      const response = await fetch('/api/auth/verify-security-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityKey })
      });

      const result = await response.json();

      if (result.success) {
        set({
          securityKeyHash: result.securityKeyHash,
          isDefaultSecurityKey: result.isDefaultSecurityKey,
          wrongAttempts: 0,
          lockoutUntil: null
        });
        return { success: true };
      } else {
        set({
          wrongAttempts: result.wrongAttempts || get().wrongAttempts + 1,
          lockoutUntil: result.lockoutUntil || null
        });
        return { success: false, message: result.message };
      }
    } catch {
      return { success: false, message: 'Server unavailable. Please try again.' };
    }
  },

  changeSecurityKey: async (newSecurityKey) => {
    const { pinHash, securityKeyHash } = get();
    try {
      const response = await fetch('/api/auth/change-security-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash || '',
          'x-cms-security-key-hash': securityKeyHash || ''
        },
        body: JSON.stringify({ newSecurityKey })
      });

      const result = await response.json();

      if (result.success) {
        set({ isDefaultSecurityKey: false, securityKeyHash: result.securityKeyHash });
        get().logActivity('Security', 'Master Key Change', 'Master Security Key was updated');
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch {
      return { success: false, message: 'Server unavailable. Please try again.' };
    }
  },

  changePin: async (newPin) => {
    const { pinHash, securityKeyHash } = get();
    
    try {
      const response = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash || '',
          'x-cms-security-key-hash': securityKeyHash || ''
        },
        body: JSON.stringify({ currentPin: null, newPin }) // Server validates via header
      });

      const result = await response.json();

      if (result.success) {
        set({ isDefaultPin: false, pinHash: result.pinHash });
        get().logActivity('Security', 'PIN Change', 'Admin PIN was updated');
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch {
      return { success: false, message: 'Server unavailable.' };
    }
  },

  fetchRolesStatus: async () => {
    const { token, pinHash } = get();
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (pinHash) headers['x-cms-pin-hash'] = pinHash;

      const res = await fetch('/api/auth/roles-status', { headers });
      const data = await res.json();
      if (data.success) {
        return { success: true, roles: data.roles };
      }
      return { success: false, message: data.message };
    } catch {
      return { success: false, message: 'Server unavailable.' };
    }
  },

  changeRolePin: async (role, newPin, resetToDefault = false) => {
    const { token, pinHash } = get();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (pinHash) headers['x-cms-pin-hash'] = pinHash;

      const res = await fetch('/api/auth/change-role-pin', {
        method: 'POST',
        headers,
        body: JSON.stringify({ role, newPin, resetToDefault })
      });
      const data = await res.json();
      if (data.success) {
        get().logActivity('Security', 'Role Access', `${role.toUpperCase()} PIN was modified by Super Admin`);
        return { success: true, message: data.message, isDefault: data.isDefault };
      }
      return { success: false, message: data.message };
    } catch {
      return { success: false, message: 'Server unavailable.' };
    }
  },

  updateActivity: () => {
    const { isAuthenticated, lastActivity } = get();
    if (!isAuthenticated) return;
    
    // Check if session expired (5 minutes)
    if (lastActivity && Date.now() - lastActivity > 5 * 60 * 1000) {
      set({ isAuthenticated: false, lastActivity: null, pinHash: null, securityKeyHash: null, isDefaultSecurityKey: false });
      return;
    }
    
    // Throttle state updates: don't write to state more than once every 2 seconds
    if (lastActivity && Date.now() - lastActivity < 2000) {
      return;
    }
    
    set({ lastActivity: Date.now() });
  },

  // Draft/Live tracking
  setSectionDraft: (sectionKey, isDraft = true) => {
    const current = get().draftFlags;
    const updated = { ...current, [sectionKey]: isDraft };
    localStorage.setItem('lakshya_cms_draft_flags', JSON.stringify(updated));
    set({ draftFlags: updated });
  },

  publishAll: () => {
    // Clear all draft flags (they are now live)
    const updated = {};
    localStorage.setItem('lakshya_cms_draft_flags', JSON.stringify(updated));
    set({ draftFlags: updated });
    get().logActivity('Published', 'Global', 'Published all draft changes to the live site');
  },

  // Form dirty (unsaved changes) tracking
  setSectionDirty: (sectionKey, isDirty) => {
    set((state) => {
      const updated = { ...state.unsavedSections };
      if (isDirty) {
        updated[sectionKey] = true;
      } else {
        delete updated[sectionKey];
      }
      return { unsavedSections: updated };
    });
  },

  clearUnsaved: () => {
    set({ unsavedSections: {} });
  },

  fetchLogs: async () => {
    const { pinHash } = get();
    if (!pinHash) return;
    try {
      const response = await fetch('/api/logs', {
        headers: { 'x-cms-pin-hash': pinHash }
      });
      if (response.ok) {
        const serverLogs = await response.json();
        set({ logs: serverLogs });
      }
    } catch (e) {
      console.error('Failed to fetch activity logs:', e);
    }
  },

  logActivity: async (action, section, description) => {
    const logEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      action, // 'Created' | 'Updated' | 'Deleted' | 'Published' | 'Security'
      section,
      description
    };
    
    set((state) => ({ logs: [logEntry, ...state.logs].slice(0, 500) }));

    const { pinHash } = get();
    if (!pinHash) return;
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash
        },
        body: JSON.stringify(logEntry)
      });
    } catch (e) {
      console.error('Failed to sync log entry:', e);
    }
  },

  clearLogs: async () => {
    set({ logs: [] });
    const { pinHash, securityKeyHash } = get();
    if (!pinHash) return;
    try {
      await fetch('/api/logs/clear', {
        method: 'POST',
        headers: { 
          'x-cms-pin-hash': pinHash,
          'x-cms-security-key-hash': securityKeyHash || ''
        }
      });
    } catch (e) {
      console.error('Failed to clear logs on server:', e);
    }
  },

  // Media Library helper
  addMediaFile: async (fileEntry) => {
    try {
      const { pinHash, mediaFiles } = get();
      if (!pinHash) return;
      
      const updatedFiles = [fileEntry, ...mediaFiles];
      set({ mediaFiles: updatedFiles });
      
      await fetch('/api/cms/mediaFiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash
        },
        body: JSON.stringify(updatedFiles)
      });
    } catch (e) {
      console.error('Failed to sync media file to server:', e);
    }
  },

  deleteMediaFile: async (id) => {
    try {
      const { pinHash, mediaFiles } = get();
      if (!pinHash) return;
      
      const fileToDelete = mediaFiles.find(f => f.id === id);
      const updatedFiles = mediaFiles.filter(f => f.id !== id);
      set({ mediaFiles: updatedFiles });
      
      if (fileToDelete) {
        get().logActivity('Deleted', 'Media Library', `Deleted file: ${fileToDelete.name}`);
      }
      
      await fetch('/api/cms/mediaFiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash
        },
        body: JSON.stringify(updatedFiles)
      });
    } catch (e) {
      console.error('Failed to delete media file from server:', e);
    }
  }
}));
