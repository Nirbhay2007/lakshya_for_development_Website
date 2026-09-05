import React, { useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { KeyRound, AlertTriangle, ShieldCheck, RefreshCw, Send } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';

export default function SecurityLockPanel({ onUnlock }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const verifySecurityKey = useAdminStore((state) => state.verifySecurityKey);
  const isDefaultSecurityKey = useAdminStore((state) => state.isDefaultSecurityKey);

  // Recovery States
  const [recoveryStep, setRecoveryStep] = useState(null); // null, 'verify', 'new-key'
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryDigits, setRecoveryDigits] = useState(['', '', '', '', '', '']);
  const [recoveryKeyDigits, setRecoveryKeyDigits] = useState(['', '', '', '', '', '']);
  const [recoveryKeyConfirm, setRecoveryKeyConfirm] = useState(['', '', '', '', '', '']);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const inputRefs = useRef([]);
  const recoveryRefs = useRef([]);
  const keyRefs = useRef([]);
  const keyConfirmRefs = useRef([]);
  
  const shakeAnimation = useAnimation();

  // Clear inputs helper
  const clearDigits = (setter) => {
    setter(['', '', '', '', '', '']);
  };

  const handleDigitChange = (value, index, currentDigits, setDigits, refs, nextAction) => {
    const cleanValue = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...currentDigits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);

    if (cleanValue && index < 5) {
      refs.current[index + 1]?.focus();
    } else if (cleanValue && index === 5) {
      nextAction(newDigits.join(''));
    }
  };

  const handleKeyDown = (e, index, currentDigits, setDigits, refs) => {
    if (e.key === 'Backspace') {
      if (!currentDigits[index] && index > 0) {
        const newDigits = [...currentDigits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        refs.current[index - 1]?.focus();
      } else {
        const newDigits = [...currentDigits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    }
  };

  const submitKey = async (keyString) => {
    if (keyString.length !== 6) return;
    setLoading(true);
    setErrorMsg('');

    const res = await verifySecurityKey(keyString);
    setLoading(false);

    if (res.success) {
      if (onUnlock) onUnlock();
    } else {
      setErrorMsg(res.message || 'Incorrect Security Key.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      shakeAnimation.start({
        x: [-10, 10, -10, 10, -5, 5, 0],
        transition: { duration: 0.4 }
      });
    }
  };

  // 1. Trigger code request to email
  const handleResetRequest = async () => {
    setRecoveryLoading(true);
    setErrorMsg('');
    setRecoveryMessage('');
    try {
      const res = await fetch('/api/auth/reset-master-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryStep('verify');
        setRecoveryMessage(data.message);
      } else {
        setErrorMsg(data.message || 'Reset request failed.');
      }
    } catch (err) {
      setErrorMsg('Network error requesting Master Key reset.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // 2. Verification of code entry (moves to new-key step)
  const handleResetConfirm = async (codeString) => {
    if (codeString.length !== 6) return;
    setRecoveryLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/verify-reset-master-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeString })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryCode(codeString);
        setRecoveryStep('new-key');
      } else {
        setErrorMsg(data.message || 'Incorrect verification code.');
        clearDigits(setRecoveryDigits);
        recoveryRefs.current[0]?.focus();
      }
    } catch (err) {
      setErrorMsg('Network error verifying code.');
      clearDigits(setRecoveryDigits);
      recoveryRefs.current[0]?.focus();
    } finally {
      setRecoveryLoading(false);
    }
  };

  // 3. Save new Master Key
  const submitRecoveryKey = async (newKeyString) => {
    const confirmString = recoveryKeyConfirm.join('');
    if (newKeyString.length !== 6) return;
    if (newKeyString !== confirmString) {
      setErrorMsg('Key confirmation does not match.');
      clearDigits(setRecoveryKeyConfirm);
      keyConfirmRefs.current[0]?.focus();
      return;
    }
    if (newKeyString === '999999') {
      setErrorMsg('Cannot use the default Master Key.');
      clearDigits(setRecoveryKeyDigits);
      clearDigits(setRecoveryKeyConfirm);
      keyRefs.current[0]?.focus();
      return;
    }

    setRecoveryLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/reset-master-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: recoveryCode, newMasterKey: newKeyString })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryStep(null);
        setRecoveryMessage('');
        alert('Master Key Reset Successful!\n\nYou can now use your newly configured Master Security Key to unlock this page.');
        window.location.reload();
      } else {
        setErrorMsg(data.message || 'Reset confirmation failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to update Master Security Key.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#060a06]/95 backdrop-blur-md z-40 flex items-center justify-center p-6 rounded-3xl">
      <motion.div
        animate={shakeAnimation}
        className="w-full max-w-sm p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center shadow-2xl space-y-6"
      >
        {recoveryStep === 'verify' ? (
          /* CODE VERIFY SCREEN */
          <div className="space-y-6">
            <div className="mx-auto w-12 h-12 bg-admin-accent/10 rounded-full flex items-center justify-center text-admin-accent-hi">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
            </div>

            <div>
              <h3 className="font-display font-semibold text-lg text-admin-text">Verify Reset Code</h3>
              <p className="text-xs text-admin-muted mt-1 font-sans leading-relaxed">
                Enter the 6-digit verification code sent to your registered email to choose a new Master Key.
              </p>
            </div>

            {recoveryMessage && (
              <div className="p-2.5 bg-admin-accent/5 rounded-xl border border-admin-accent/10 text-[11px] text-admin-accent-hi font-sans text-left">
                {recoveryMessage}
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-500 font-sans font-medium">{errorMsg}</p>
            )}

            <div className="flex justify-center gap-2">
              {recoveryDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (recoveryRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, idx, recoveryDigits, setRecoveryDigits, recoveryRefs, handleResetConfirm)}
                  onKeyDown={(e) => handleKeyDown(e, idx, recoveryDigits, setRecoveryDigits, recoveryRefs)}
                  style={{ WebkitTextSecurity: 'disc' }}
                  autoComplete="one-time-code"
                  className="w-10 h-12 text-center text-xl font-bold bg-white/[0.04] border border-white/[0.08] focus:border-admin-accent rounded-lg text-admin-text focus:outline-none focus:bg-white/[0.08] transition-all font-sans"
                />
              ))}
            </div>

            <button
              onClick={() => { setRecoveryStep(null); setErrorMsg(''); }}
              className="text-xs text-admin-muted hover:text-admin-text underline font-sans"
            >
              Cancel and Go Back
            </button>
          </div>
        ) : recoveryStep === 'new-key' ? (
          /* CREATE NEW MASTER KEY SCREEN */
          <div className="space-y-6">
            <div className="mx-auto w-12 h-12 bg-admin-amber/10 rounded-full flex items-center justify-center text-admin-amber">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-display font-semibold text-lg text-admin-text">Create New Master Key</h3>
              <p className="text-xs text-admin-muted mt-1 font-sans leading-relaxed">
                Verification successful. Choose a new secure 6-digit Master Key to configure key restrictions.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 font-sans font-medium">{errorMsg}</p>
            )}

            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] uppercase font-bold text-admin-muted tracking-wider mb-2 block font-sans">
                  New Master Key
                </label>
                <div className="flex gap-2 justify-center">
                  {recoveryKeyDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (keyRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(e.target.value, idx, recoveryKeyDigits, setRecoveryKeyDigits, keyRefs, () => {})}
                      onKeyDown={(e) => handleKeyDown(e, idx, recoveryKeyDigits, setRecoveryKeyDigits, keyRefs)}
                      style={{ WebkitTextSecurity: 'disc' }}
                      autoComplete="one-time-code"
                      className="w-10 h-12 text-center text-xl font-bold bg-white/[0.04] border border-white/[0.08] focus:border-admin-amber rounded-lg text-admin-text focus:outline-none focus:bg-white/[0.08] transition-all font-sans"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-admin-muted tracking-wider mb-2 block font-sans">
                  Confirm Master Key
                </label>
                <div className="flex gap-2 justify-center">
                  {recoveryKeyConfirm.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (keyConfirmRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(e.target.value, idx, recoveryKeyConfirm, setRecoveryKeyConfirm, keyConfirmRefs, () => {})}
                      onKeyDown={(e) => handleKeyDown(e, idx, recoveryKeyConfirm, setRecoveryKeyConfirm, keyConfirmRefs)}
                      style={{ WebkitTextSecurity: 'disc' }}
                      autoComplete="one-time-code"
                      className="w-10 h-12 text-center text-xl font-bold bg-white/[0.04] border border-white/[0.08] focus:border-admin-amber rounded-lg text-admin-text focus:outline-none focus:bg-white/[0.08] transition-all font-sans"
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => submitRecoveryKey(recoveryKeyDigits.join(''))}
              className="w-full admin-btn-primary py-3 font-semibold text-xs flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Update Master Key</span>
            </button>
          </div>
        ) : (
          /* STANDARD KEY PROTECTION SCREEN */
          <>
            <div className="mx-auto w-12 h-12 bg-admin-amber/10 rounded-full flex items-center justify-center text-admin-amber">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <h3 className="font-display font-semibold text-lg text-admin-text">Verification Required</h3>
              <p className="text-xs text-admin-muted mt-1 font-sans">
                Please enter your 6-digit Master Security Key to access this page.
              </p>
            </div>

            {isDefaultSecurityKey && (
              <div className="p-3 bg-admin-amber/5 rounded-xl border border-admin-amber/10 flex items-start gap-2.5 text-left text-[11px] text-admin-amber font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Security Warning:</strong> You are currently using the default Master Key (<code className="font-mono">999999</code>). Change it under Security Settings immediately.
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, idx, digits, setDigits, inputRefs, submitKey)}
                  onKeyDown={(e) => handleKeyDown(e, idx, digits, setDigits, inputRefs)}
                  disabled={loading}
                  style={{ WebkitTextSecurity: 'disc' }}
                  autoComplete="one-time-code"
                  className="w-10 h-12 text-center text-xl font-bold bg-white/[0.04] border border-white/[0.08] focus:border-admin-accent rounded-lg text-admin-text focus:outline-none focus:bg-white/[0.08] transition-all font-sans"
                />
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 font-sans font-medium">{errorMsg}</p>
            )}

            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                disabled={recoveryLoading}
                onClick={handleResetRequest}
                className="text-xs text-admin-accent hover:text-admin-accent-hi underline font-sans inline-flex items-center justify-center gap-1.5 disabled:opacity-50 select-none"
              >
                {recoveryLoading ? (
                  <>
                    <span className="w-3 h-3 border border-admin-accent-hi/30 border-t-admin-accent-hi rounded-full animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  'Forgot Master Key?'
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
