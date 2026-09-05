import React, { useState, useRef } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertTriangle, Mail } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAdminStore } from '../store/useAdminStore';
import SecurityLockPanel from '../components/ui/SecurityLockPanel';
import toast from 'react-hot-toast';

export default function SecuritySettings() {
  const securityKeyHash = useAdminStore((state) => state.securityKeyHash);
  const isDefaultSecurityKey = useAdminStore((state) => state.isDefaultSecurityKey);
  const changePin = useAdminStore((state) => state.changePin);
  const changeSecurityKey = useAdminStore((state) => state.changeSecurityKey);

  const [isUnlocked, setIsUnlocked] = useState(!!securityKeyHash);

  React.useEffect(() => {
    return () => {
      useAdminStore.getState().lockSecurity();
    };
  }, []);

  // Form states
  const [recoveryEmail, setRecoveryEmail] = React.useState('');
  const [emailLoading, setEmailLoading] = React.useState(false);
  const [emailSaving, setEmailSaving] = React.useState(false);

  // Fetch email on unlock
  React.useEffect(() => {
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

  // Handle Save Recovery Email
  const handleUpdateRecoveryEmail = async (e) => {
    e.preventDefault();
    setEmailSaving(true);

    const store = useAdminStore.getState();
    const pinHash = store.pinHash;
    const securityKeyHash = store.securityKeyHash;

    try {
      const res = await fetch('/api/auth/change-recovery-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash || '',
          'x-cms-security-key-hash': securityKeyHash || ''
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

  // Form states
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

  const clearDigits = (setDigits) => {
    setDigits(['', '', '', '', '', '']);
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
      toast.success('Login PIN successfully updated!');
      clearDigits(setPinDigits);
      clearDigits(setPinConfirm);
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
      clearDigits(setKeyDigits);
      clearDigits(setKeyConfirm);
    } else {
      toast.error(res.message || 'Failed to update Security Key.');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="relative w-full h-[60vh] max-w-5xl mx-auto">
        <SecurityLockPanel onUnlock={() => setIsUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-8 relative z-10">
      <PageHeader
        title="Security & Credentials"
        subtitle="Manage authorization PINs and Master recovery keys for portal operations."
        icon={Lock}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Box A: Change PIN */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/[0.04] bg-white/[0.01] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-admin-accent">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-display font-semibold text-lg text-admin-text">Change Login PIN</h3>
            </div>
            <p className="text-xs text-admin-muted font-sans leading-relaxed">
              Update the 6-digit numeric passcode used to authenticate into this admin portal. Keep this safe.
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
                className="w-full mt-4 py-2.5 bg-admin-accent hover:bg-admin-accent-hi text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {pinLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Update Login PIN'
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
                className="w-full mt-4 py-2.5 bg-admin-amber hover:bg-amber-600 text-charcoal rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
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
      <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/[0.04] bg-white/[0.01] max-w-2xl mx-auto space-y-4 mt-8">
        <div className="flex items-center gap-3 text-admin-accent">
          <Mail className="w-5 h-5" />
          <h3 className="font-display font-semibold text-lg text-admin-text">Emergency Recovery Email</h3>
        </div>
        <p className="text-xs text-admin-muted font-sans leading-relaxed">
          Configure a secure, dedicated email address to receive OTP verification codes for forgotten Login PINs and Master Security Keys. If left blank, resets default back to your public contact settings.
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
              className="w-full mt-2 py-2.5 bg-admin-accent hover:bg-admin-accent-hi text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
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
  );
}
