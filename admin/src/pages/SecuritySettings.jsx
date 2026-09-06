import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, ShieldCheck, KeyRound, AlertTriangle, Mail, Users, 
  CheckCircle2, XCircle, RotateCcw, Key, Edit3, Calculator, 
  ShieldAlert, Check, HelpCircle
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAdminStore } from '../store/useAdminStore';
import SecurityLockPanel from '../components/ui/SecurityLockPanel';
import toast from 'react-hot-toast';

function PinInputRow({ digits, setDigits, inputRefs, disabled }) {
  const handleDigitChange = (value, index) => {
    const cleanValue = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    }
  };

  return (
    <div className="flex gap-2">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputRefs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleDigitChange(e.target.value, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          style={{ WebkitTextSecurity: 'disc' }}
          autoComplete="one-time-code"
          className="w-8 h-9 sm:w-9 sm:h-10 text-center text-lg font-bold bg-white/[0.03] border border-white/[0.08] focus:border-admin-accent rounded-lg text-admin-text focus:outline-none transition-all font-mono disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default function SecuritySettings() {
  const securityKeyHash = useAdminStore((state) => state.securityKeyHash);
  const isDefaultSecurityKey = useAdminStore((state) => state.isDefaultSecurityKey);
  const changePin = useAdminStore((state) => state.changePin);
  const changeSecurityKey = useAdminStore((state) => state.changeSecurityKey);
  const fetchRolesStatus = useAdminStore((state) => state.fetchRolesStatus);
  const changeRolePin = useAdminStore((state) => state.changeRolePin);

  const [activeTab, setActiveTab] = useState('roles'); // 'roles' | 'master'
  const [isUnlocked, setIsUnlocked] = useState(!!securityKeyHash);

  // Role Management State
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Separate PIN inputs for Editor
  const [editorDigits, setEditorDigits] = useState(['', '', '', '', '', '']);
  const [editorConfirm, setEditorConfirm] = useState(['', '', '', '', '', '']);
  const [editorLoading, setEditorLoading] = useState(false);
  const editorRefs = useRef([]);
  const editorConfirmRefs = useRef([]);

  // Separate PIN inputs for Finance
  const [financeDigits, setFinanceDigits] = useState(['', '', '', '', '', '']);
  const [financeConfirm, setFinanceConfirm] = useState(['', '', '', '', '', '']);
  const [financeLoading, setFinanceLoading] = useState(false);
  const financeRefs = useRef([]);
  const financeConfirmRefs = useRef([]);

  // Master Settings Form states
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);

  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [pinConfirm, setPinConfirm] = useState(['', '', '', '', '', '']);
  const [pinLoading, setPinLoading] = useState(false);

  const [keyDigits, setKeyDigits] = useState(['', '', '', '', '', '']);
  const [keyConfirm, setKeyConfirm] = useState(['', '', '', '', '', '']);
  const [keyLoading, setKeyLoading] = useState(false);

  const pinRefs = useRef([]);
  const pinConfirmRefs = useRef([]);
  const keyRefs = useRef([]);
  const keyConfirmRefs = useRef([]);

  useEffect(() => {
    return () => {
      useAdminStore.getState().lockSecurity();
    };
  }, []);

  // Fetch Roles Status
  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetchRolesStatus();
      if (res.success && Array.isArray(res.roles)) {
        setRoles(res.roles);
      }
    } catch (e) {
      console.error('Failed to load roles:', e);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // Fetch email on unlock
  useEffect(() => {
    if (isUnlocked) {
      const fetchEmail = async () => {
        setEmailLoading(true);
        const store = useAdminStore.getState();
        const pinHash = store.pinHash;
        const securityKeyHash = store.securityKeyHash;

        try {
          const res = await fetch('/api/auth/recovery-email', {
            headers: {
              'x-cms-pin-hash': pinHash || '',
              'x-cms-security-key-hash': securityKeyHash || ''
            }
          });
          const result = await res.json();
          if (res.ok && result.success) {
            setRecoveryEmail(result.recoveryEmail || '');
          }
        } catch (e) {
          console.error('Failed to load recovery email:', e);
        } finally {
          setEmailLoading(false);
        }
      };
      fetchEmail();
    }
  }, [isUnlocked]);

  // Handle Role PIN Update
  const handleUpdateRolePin = async (e, roleType) => {
    e.preventDefault();
    const isEditor = roleType === 'editor';
    const digits = isEditor ? editorDigits : financeDigits;
    const confirm = isEditor ? editorConfirm : financeConfirm;
    const setLoading = isEditor ? setEditorLoading : setFinanceLoading;
    const clearInputs = () => {
      if (isEditor) {
        setEditorDigits(['', '', '', '', '', '']);
        setEditorConfirm(['', '', '', '', '', '']);
      } else {
        setFinanceDigits(['', '', '', '', '', '']);
        setFinanceConfirm(['', '', '', '', '', '']);
      }
    };

    const newPin = digits.join('');
    const confirmPin = confirm.join('');

    if (newPin.length !== 6 || confirmPin.length !== 6) {
      toast.error('Please enter all 6 digits for the new role PIN');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PIN confirmation does not match');
      return;
    }

    setLoading(true);
    try {
      const res = await changeRolePin(roleType, newPin, false);
      if (res.success) {
        toast.success(res.message || `${roleType.toUpperCase()} PIN updated!`);
        clearInputs();
        await loadRoles();
      } else {
        toast.error(res.message || 'Failed to update role PIN');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Role PIN to Default
  const handleResetRolePin = async (roleType, defaultPin) => {
    if (!window.confirm(`Are you sure you want to reset the ${roleType.toUpperCase()} PIN to default (${defaultPin})?`)) {
      return;
    }

    const isEditor = roleType === 'editor';
    const setLoading = isEditor ? setEditorLoading : setFinanceLoading;

    setLoading(true);
    try {
      const res = await changeRolePin(roleType, defaultPin, true);
      if (res.success) {
        toast.success(res.message);
        await loadRoles();
      } else {
        toast.error(res.message || 'Failed to reset role PIN');
      }
    } finally {
      setLoading(false);
    }
  };

  // Master Key & Super Admin PIN changers
  const handleDigitChange = (value, index, digits, setDigits, refs) => {
    const cleanValue = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);
    if (cleanValue && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index, digits, setDigits, refs) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        refs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    const newPin = pinDigits.join('');
    const confirm = pinConfirm.join('');

    if (newPin.length !== 6 || confirm.length !== 6) {
      toast.error('Please fill in all 6 digits for the new PIN');
      return;
    }
    if (newPin !== confirm) {
      toast.error('PIN codes do not match');
      return;
    }
    if (newPin === '123456') {
      toast.error('Cannot use default PIN "123456"');
      return;
    }

    setPinLoading(true);
    const res = await changePin(newPin);
    setPinLoading(false);

    if (res.success) {
      toast.success('Super Admin Login PIN successfully updated!');
      setPinDigits(['', '', '', '', '', '']);
      setPinConfirm(['', '', '', '', '', '']);
    } else {
      toast.error(res.message || 'Failed to update PIN.');
    }
  };

  const handleUpdateSecurityKey = async (e) => {
    e.preventDefault();
    const newKey = keyDigits.join('');
    const confirm = keyConfirm.join('');

    if (newKey.length !== 6 || confirm.length !== 6) {
      toast.error('Please fill in all 6 digits for the new Security Key');
      return;
    }
    if (newKey !== confirm) {
      toast.error('Security Keys do not match');
      return;
    }
    if (newKey === '999999') {
      toast.error('Cannot use default Security Key "999999"');
      return;
    }

    setKeyLoading(true);
    const res = await changeSecurityKey(newKey);
    setKeyLoading(false);

    if (res.success) {
      toast.success('Master Security Key successfully updated!');
      setKeyDigits(['', '', '', '', '', '']);
      setKeyConfirm(['', '', '', '', '', '']);
    } else {
      toast.error(res.message || 'Failed to update Security Key.');
    }
  };

  const handleUpdateRecoveryEmail = async (e) => {
    e.preventDefault();
    setEmailSaving(true);
    const store = useAdminStore.getState();

    try {
      const res = await fetch('/api/auth/change-recovery-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': store.pinHash || '',
          'x-cms-security-key-hash': store.securityKeyHash || ''
        },
        body: JSON.stringify({ recoveryEmail })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success('Emergency Recovery Email updated successfully!');
      } else {
        toast.error(result.message || 'Failed to update recovery email.');
      }
    } catch (e) {
      toast.error('Network error updating recovery email.');
    } finally {
      setEmailSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-6 relative z-10 font-sans text-left">
      <PageHeader
        title="Security & Access Control"
        description="Manage portal authorization passcodes, role-based access control (RBAC), and Master recovery credentials."
        icon={Lock}
      />

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-admin-border gap-2 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'border-admin-accent text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Roles & Passwords</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'master'
              ? 'border-admin-accent text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Super Admin Master Keys</span>
        </button>
      </div>

      {/* TAB 1: TEAM ROLES & PASSWORDS */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="glass-panel p-5 rounded-2xl border border-admin-border bg-admin-surface flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-admin-accent/15 text-admin-accent-hi shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-admin-text">Role-Based Access Control (RBAC) Management</h4>
              <p className="text-xs text-admin-muted mt-1 leading-relaxed">
                As Super Admin, you can assign, rotate, and reset 6-digit PIN passcodes for subordinate staff roles.
                Delegated users log into the admin portal using their respective role PIN, and the interface will dynamically adapt to only reveal permitted features.
              </p>
            </div>
          </div>

          {rolesLoading ? (
            <div className="text-center py-16 text-admin-muted text-sm">
              <span className="w-5 h-5 border-2 border-admin-accent/30 border-t-admin-accent rounded-full animate-spin inline-block mr-2 align-middle" />
              Loading team role credentials...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Role 1: Content Editor */}
              {(() => {
                const editorRole = roles.find((r) => r.role === 'editor') || {
                  role: 'editor',
                  title: 'Content Editor',
                  isDefault: true,
                  defaultPin: '234567',
                  description: 'Manages website content, news, gallery, programmes, impact metrics, and reviews volunteer/job submissions.',
                  allowedSections: ['Hero Slider', 'Events Ticker', 'About Section', 'Programmes', 'Impact Numbers', 'Gallery', 'Partners', 'Team', 'Contact Page', 'Careers Page', 'Legal Pages', 'Media Library'],
                  restrictedSections: ['Donations Financials', 'Master Security Keys', 'System Backups', 'Global Settings', 'Audit Logs']
                };

                return (
                  <div className="glass-panel p-6 rounded-2xl border border-admin-border bg-admin-surface flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                            <Edit3 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-admin-text">{editorRole.title}</h3>
                            <span className="text-[11px] font-mono text-admin-muted">role: editor</span>
                          </div>
                        </div>

                        {editorRole.isDefault ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Default PIN ({editorRole.defaultPin})</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-forest-500/15 text-forest-400 border border-forest-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Custom Secured PIN</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-admin-muted leading-relaxed">
                        {editorRole.description}
                      </p>

                      {/* Permissions Breakdown */}
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Authorized Areas</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {editorRole.allowedSections.map((sec) => (
                              <span key={sec} className="px-2 py-0.5 rounded bg-forest-500/10 text-forest-300 text-[10px] font-medium">
                                {sec}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.04]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-admin-danger/90 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>Strictly Prohibited</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {editorRole.restrictedSections.map((sec) => (
                              <span key={sec} className="px-2 py-0.5 rounded bg-admin-danger/10 text-admin-danger/90 text-[10px] font-medium">
                                {sec}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* PIN Change Form */}
                      <form onSubmit={(e) => handleUpdateRolePin(e, 'editor')} className="space-y-3 pt-2">
                        <div>
                          <label className="text-xs font-semibold text-admin-muted block mb-1">
                            Set New 6-Digit Editor PIN
                          </label>
                          <PinInputRow
                            digits={editorDigits}
                            setDigits={setEditorDigits}
                            inputRefs={editorRefs}
                            disabled={editorLoading}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-admin-muted block mb-1">
                            Confirm New Editor PIN
                          </label>
                          <PinInputRow
                            digits={editorConfirm}
                            setDigits={setEditorConfirm}
                            inputRefs={editorConfirmRefs}
                            disabled={editorLoading}
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="submit"
                            disabled={editorLoading}
                            className="flex-1 py-2.5 bg-admin-accent hover:bg-admin-accent-hi text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {editorLoading ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Key className="w-3.5 h-3.5" />
                                <span>Save Editor PIN</span>
                              </>
                            )}
                          </button>

                          {!editorRole.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleResetRolePin('editor', editorRole.defaultPin)}
                              disabled={editorLoading}
                              className="px-3 py-2.5 bg-admin-surface border border-admin-border hover:border-admin-amber text-admin-muted hover:text-admin-amber text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                              title="Reset to default PIN 234567"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })()}

              {/* Role 2: Finance Officer */}
              {(() => {
                const financeRole = roles.find((r) => r.role === 'finance') || {
                  role: 'finance',
                  title: 'Finance & Compliance Officer',
                  isDefault: true,
                  defaultPin: '345678',
                  description: 'Monitors donations, tracks 80G tax exemptions, exports Form 10BD CSV for Income Tax filing, and downloads official 80G PDF receipts.',
                  allowedSections: ['Dashboard Analytics', 'Submissions Inquiries', 'Donations Log & Receipts', 'Form 10BD Export', 'Newsletter Subscribers'],
                  restrictedSections: ['CMS Page Editors', 'Hero Slider', 'About Section', 'Master Security Keys', 'System Backups', 'Media Library']
                };

                return (
                  <div className="glass-panel p-6 rounded-2xl border border-admin-border bg-admin-surface flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                            <Calculator className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-admin-text">{financeRole.title}</h3>
                            <span className="text-[11px] font-mono text-admin-muted">role: finance</span>
                          </div>
                        </div>

                        {financeRole.isDefault ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Default PIN ({financeRole.defaultPin})</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-forest-500/15 text-forest-400 border border-forest-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Custom Secured PIN</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-admin-muted leading-relaxed">
                        {financeRole.description}
                      </p>

                      {/* Permissions Breakdown */}
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Authorized Areas</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {financeRole.allowedSections.map((sec) => (
                              <span key={sec} className="px-2 py-0.5 rounded bg-forest-500/10 text-forest-300 text-[10px] font-medium">
                                {sec}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.04]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-admin-danger/90 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>Strictly Prohibited</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {financeRole.restrictedSections.map((sec) => (
                              <span key={sec} className="px-2 py-0.5 rounded bg-admin-danger/10 text-admin-danger/90 text-[10px] font-medium">
                                {sec}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* PIN Change Form */}
                      <form onSubmit={(e) => handleUpdateRolePin(e, 'finance')} className="space-y-3 pt-2">
                        <div>
                          <label className="text-xs font-semibold text-admin-muted block mb-1">
                            Set New 6-Digit Finance PIN
                          </label>
                          <PinInputRow
                            digits={financeDigits}
                            setDigits={setFinanceDigits}
                            inputRefs={financeRefs}
                            disabled={financeLoading}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-admin-muted block mb-1">
                            Confirm New Finance PIN
                          </label>
                          <PinInputRow
                            digits={financeConfirm}
                            setDigits={setFinanceConfirm}
                            inputRefs={financeConfirmRefs}
                            disabled={financeLoading}
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="submit"
                            disabled={financeLoading}
                            className="flex-1 py-2.5 bg-admin-accent hover:bg-admin-accent-hi text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {financeLoading ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Key className="w-3.5 h-3.5" />
                                <span>Save Finance PIN</span>
                              </>
                            )}
                          </button>

                          {!financeRole.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleResetRolePin('finance', financeRole.defaultPin)}
                              disabled={financeLoading}
                              className="px-3 py-2.5 bg-admin-surface border border-admin-border hover:border-admin-amber text-admin-muted hover:text-admin-amber text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                              title="Reset to default PIN 345678"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPER ADMIN MASTER KEYS */}
      {activeTab === 'master' && (
        <>
          {!isUnlocked ? (
            <div className="relative w-full h-[60vh] max-w-5xl mx-auto">
              <SecurityLockPanel onUnlock={() => setIsUnlocked(true)} />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Box A: Change PIN */}
                <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/[0.04] bg-white/[0.01] flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-admin-accent">
                      <ShieldCheck className="w-5 h-5" />
                      <h3 className="font-display font-semibold text-lg text-admin-text">Change Super Admin PIN</h3>
                    </div>
                    <p className="text-xs text-admin-muted font-sans leading-relaxed">
                      Update the 6-digit numeric passcode used to authenticate the Super Administrator account into this admin portal.
                    </p>

                    <form onSubmit={handleUpdatePin} className="space-y-5 pt-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-admin-muted font-sans block">
                          New 6-Digit PIN
                        </label>
                        <div className="flex gap-2">
                          {pinDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => (pinRefs.current[idx] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleDigitChange(e.target.value, idx, pinDigits, setPinDigits, pinRefs)}
                              onKeyDown={(e) => handleKeyDown(e, idx, pinDigits, setPinDigits, pinRefs)}
                              style={{ WebkitTextSecurity: 'disc' }}
                              autoComplete="one-time-code"
                              className="w-9 h-10 text-center text-lg font-bold bg-white/[0.03] border border-white/[0.08] focus:border-admin-accent rounded-lg text-admin-text focus:outline-none transition-all font-sans"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-admin-muted font-sans block">
                          Confirm New PIN
                        </label>
                        <div className="flex gap-2">
                          {pinConfirm.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => (pinConfirmRefs.current[idx] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleDigitChange(e.target.value, idx, pinConfirm, setPinConfirm, pinConfirmRefs)}
                              onKeyDown={(e) => handleKeyDown(e, idx, pinConfirm, setPinConfirm, pinConfirmRefs)}
                              style={{ WebkitTextSecurity: 'disc' }}
                              autoComplete="one-time-code"
                              className="w-9 h-10 text-center text-lg font-bold bg-white/[0.03] border border-white/[0.08] focus:border-admin-accent rounded-lg text-admin-text focus:outline-none transition-all font-sans"
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={pinLoading}
                        className="w-full mt-4 py-2.5 bg-admin-accent hover:bg-admin-accent-hi text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {pinLoading ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Update Super Admin PIN'
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Box B: Change Master Security Key */}
                <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/[0.04] bg-white/[0.01] flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-admin-amber">
                      <KeyRound className="w-5 h-5" />
                      <h3 className="font-display font-semibold text-lg text-admin-text">Change Master Security Key</h3>
                    </div>
                    <p className="text-xs text-admin-muted font-sans leading-relaxed">
                      This secondary key is required to modify credentials, clear logs, and download/restore backup files.
                    </p>

                    {isDefaultSecurityKey && (
                      <div className="p-3 bg-admin-amber/5 rounded-xl border border-admin-amber/10 flex items-start gap-2 text-[10px] text-admin-amber font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <strong>Default Key In Use:</strong> Your current Master Key is set to <code className="font-mono bg-white/5 px-1 rounded">999999</code>. Please change it to secure your backups and credentials.
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleUpdateSecurityKey} className="space-y-5 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-admin-muted font-sans block">
                          New 6-Digit Master Key
                        </label>
                        <div className="flex gap-2">
                          {keyDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => (keyRefs.current[idx] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleDigitChange(e.target.value, idx, keyDigits, setKeyDigits, keyRefs)}
                              onKeyDown={(e) => handleKeyDown(e, idx, keyDigits, setKeyDigits, keyRefs)}
                              style={{ WebkitTextSecurity: 'disc' }}
                              autoComplete="one-time-code"
                              className="w-9 h-10 text-center text-lg font-bold bg-white/[0.03] border border-white/[0.08] focus:border-admin-amber rounded-lg text-admin-text focus:outline-none transition-all font-sans"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-admin-muted font-sans block">
                          Confirm Master Key
                        </label>
                        <div className="flex gap-2">
                          {keyConfirm.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => (keyConfirmRefs.current[idx] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleDigitChange(e.target.value, idx, keyConfirm, setKeyConfirm, keyConfirmRefs)}
                              onKeyDown={(e) => handleKeyDown(e, idx, keyConfirm, setKeyConfirm, keyConfirmRefs)}
                              style={{ WebkitTextSecurity: 'disc' }}
                              autoComplete="one-time-code"
                              className="w-9 h-10 text-center text-lg font-bold bg-white/[0.03] border border-white/[0.08] focus:border-admin-amber rounded-lg text-admin-text focus:outline-none transition-all font-sans"
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={keyLoading}
                        className="w-full mt-4 py-2.5 bg-admin-amber hover:bg-amber-600 text-charcoal rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {keyLoading ? (
                          <span className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                        ) : (
                          'Update Master Key'
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Box C: Emergency Recovery Email */}
              <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/[0.04] bg-white/[0.01] max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3 text-admin-accent">
                  <Mail className="w-5 h-5" />
                  <h3 className="font-display font-semibold text-lg text-admin-text">Emergency Recovery Email</h3>
                </div>
                <p className="text-xs text-admin-muted font-sans leading-relaxed">
                  Configure a secure, dedicated email address to receive OTP verification codes for forgotten Login PINs and Master Security Keys.
                </p>

                {emailLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <span className="w-5 h-5 border-2 border-admin-accent/30 border-t-admin-accent rounded-full animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleUpdateRecoveryEmail} className="space-y-4 pt-2 text-left">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-admin-muted font-sans block">
                        Recovery Email Address
                      </label>
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="e.g. secure-admin@organization.org"
                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-admin-accent focus:outline-none rounded-xl text-xs text-admin-text transition-all font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={emailSaving}
                      className="w-full mt-2 py-2.5 bg-admin-accent hover:bg-admin-accent-hi text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {emailSaving ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Save Recovery Email'
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
