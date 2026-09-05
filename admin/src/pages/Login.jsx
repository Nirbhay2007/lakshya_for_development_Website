import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { Lock, Unlock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAdminStore } from '../store/useAdminStore';
import logoImg from '../assets/lakshya.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const initAuth = useAdminStore((state) => state.initAuth);
  const login = useAdminStore((state) => state.login);
  const changePin = useAdminStore((state) => state.changePin);
  
  const isAuthenticated = useAdminStore((state) => state.isAuthenticated);
  const isDefaultPin = useAdminStore((state) => state.isDefaultPin);
  const lockoutUntil = useAdminStore((state) => state.lockoutUntil);
  const wrongAttempts = useAdminStore((state) => state.wrongAttempts);

  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMode, setSuccessMode] = useState(false);
  const [changePinMode, setChangePinMode] = useState(false);
  const [newPinDigits, setNewPinDigits] = useState(['', '', '', '', '', '']);
  const [newPinConfirm, setNewPinConfirm] = useState(['', '', '', '', '', '']);
  
  // Recovery wizard states
  const [recoveryStep, setRecoveryStep] = useState(null); // null, 'verify', 'new-pin'
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryDigits, setRecoveryDigits] = useState(['', '', '', '', '', '']);
  const [recoveryPinDigits, setRecoveryPinDigits] = useState(['', '', '', '', '', '']);
  const [recoveryPinConfirm, setRecoveryPinConfirm] = useState(['', '', '', '', '', '']);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Timer for lockout countdown
  const [timeRemaining, setTimeRemaining] = useState(0);

  const inputRefs = useRef([]);
  const newPinRefs = useRef([]);
  const confirmPinRefs = useRef([]);
  const recoveryRefs = useRef([]);
  const recoveryPinRefs = useRef([]);
  const recoveryPinConfirmRefs = useRef([]);
  
  const shakeAnimation = useAnimation();
  const logoAnimation = useAnimation();
  const lockIconAnimation = useAnimation();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Handle redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      if (isDefaultPin) {
        setChangePinMode(true);
      } else {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, isDefaultPin, navigate, location]);

  // Lockout timer
  useEffect(() => {
    if (lockoutUntil) {
      const updateTimer = () => {
        const diff = lockoutUntil - Date.now();
        if (diff <= 0) {
          setTimeRemaining(0);
          initAuth(); // Reload status to clear lockout state
        } else {
          setTimeRemaining(diff);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil, initAuth]);

  // Clear inputs helper
  const clearDigits = (setter) => {
    setter(['', '', '', '', '', '']);
  };

  // Move focus automatically
  const handleDigitChange = (value, index, digits, setDigits, refs, nextAction) => {
    const cleanValue = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);

    if (cleanValue && index < 5) {
      refs.current[index + 1]?.focus();
    } else if (cleanValue && index === 5) {
      // Completed last digit
      nextAction(newDigits.join(''));
    }
  };

  const handleDigitKeyDown = (e, index, digits, setDigits, refs) => {
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

  const handleResetRequest = async () => {
    setRecoveryLoading(true);
    setErrorMessage('');
    setRecoveryMessage('');
    try {
      const res = await fetch('/api/auth/reset-pin-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryStep('verify');
        setRecoveryMessage(data.message);
      } else {
        setErrorMessage(data.message || 'Reset request failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error requesting PIN reset.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetConfirm = async (codeString) => {
    if (codeString.length !== 6) return;
    setRecoveryLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/verify-reset-pin-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeString })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryCode(codeString);
        setRecoveryStep('new-pin');
      } else {
        setErrorMessage(data.message || 'Incorrect verification code.');
        clearDigits(setRecoveryDigits);
        recoveryRefs.current[0]?.focus();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error verifying code.');
      clearDigits(setRecoveryDigits);
      recoveryRefs.current[0]?.focus();
    } finally {
      setRecoveryLoading(false);
    }
  };

  const submitRecoveryPin = async (newPinString) => {
    const confirmString = recoveryPinConfirm.join('');
    if (newPinString.length !== 6) return;
    if (newPinString !== confirmString) {
      setErrorMessage('PIN confirmation does not match.');
      clearDigits(setRecoveryPinConfirm);
      recoveryPinConfirmRefs.current[0]?.focus();
      return;
    }
    if (newPinString === '123456') {
      setErrorMessage('Cannot use the default PIN.');
      clearDigits(setRecoveryPinDigits);
      clearDigits(setRecoveryPinConfirm);
      recoveryPinRefs.current[0]?.focus();
      return;
    }

    setRecoveryLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/reset-pin-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: recoveryCode, newPin: newPinString })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryStep(null);
        setRecoveryMessage('');
        alert('PIN Reset Successful!\n\nYou can now log in using your newly configured PIN.');
        window.location.reload();
      } else {
        setErrorMessage(data.message || 'Reset confirmation failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update PIN.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Submit Login
  const submitLogin = async (pinString) => {
    if (pinString.length !== 6) return;

    setErrorMessage('');
    
    // Animation play loading logo
    logoAnimation.start({
      rotate: 360,
      transition: { duration: 1.5, repeat: Infinity, ease: 'linear' }
    });

    const res = await login(pinString);
    logoAnimation.stop();

    if (res.success) {
      setSuccessMode(true);
      await lockIconAnimation.start({
        scale: [1, 1.2, 0.9, 1],
        rotate: [0, -10, 15, 0],
        transition: { duration: 0.5 }
      });
      // Will auto trigger redirect or PIN change mode in useEffect
    } else {
      setErrorMessage(res.message);
      clearDigits(setPinDigits);
      inputRefs.current[0]?.focus();
      
      // Shake animation on incorrect password
      shakeAnimation.start({
        x: [-10, 10, -10, 10, -5, 5, 0],
        transition: { duration: 0.4 }
      });
    }
  };

  // Change PIN
  const submitPinChange = async () => {
    const newPin = newPinDigits.join('');
    const confirmPin = newPinConfirm.join('');

    if (newPin.length !== 6 || confirmPin.length !== 6) {
      setErrorMessage('Please enter both 6-digit codes');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('PIN codes do not match');
      clearDigits(setNewPinDigits);
      clearDigits(setNewPinConfirm);
      newPinRefs.current[0]?.focus();
      return;
    }

    if (newPin === '123456') {
      setErrorMessage('You cannot use the default PIN. Please choose a new code.');
      clearDigits(setNewPinDigits);
      clearDigits(setNewPinConfirm);
      newPinRefs.current[0]?.focus();
      return;
    }

    await changePin(newPin);
    setChangePinMode(false);
    navigate('/');
  };

  // Format lockout timer string
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="min-h-screen bg-[#060a06] bg-radial-gradient flex items-center justify-center p-4">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-admin-accent/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-admin-amber/5 blur-[100px] pointer-events-none" />

      {/* Main glass frame */}
      <motion.div
        animate={shakeAnimation}
        className="w-full max-w-md p-8 rounded-3xl glass-panel-elevated shadow-2xl relative border border-white/[0.06] text-center"
      >
        {/* Logo/Icon Area */}
        <div className="mb-8 flex flex-col items-center select-none">
          <motion.img
            animate={logoAnimation}
            src={logoImg}
            alt="Lakshya Logo"
            className="w-14 h-14 object-contain mb-4 filter drop-shadow-[0_0_8px_rgba(76,175,80,0.3)]"
          />
          <h1 className="text-xl font-bold text-admin-text tracking-wide">LAKSHYA CMS</h1>
          <p className="text-xs text-admin-muted uppercase tracking-wider font-semibold mt-1">Admin Security Portal</p>
        </div>

        {/* LOCKOUT SCREEN */}
        {lockoutUntil && lockoutUntil > Date.now() ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-admin-danger/10 border border-admin-danger/20 flex items-center justify-center mx-auto text-admin-danger animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-admin-text">Portal Locked Out</h3>
              <p className="text-xs text-admin-muted leading-relaxed px-4">
                Too many incorrect PIN attempts. For security reasons, the portal has been locked down.
              </p>
            </div>

            <div className="bg-admin-surface border border-admin-border p-4 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-admin-muted tracking-wider block">Time Remaining</span>
              <span className="text-3xl font-mono font-bold text-admin-danger tracking-widest block mt-1">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        ) : changePinMode ? (
          /* UPDATE DEFAULT PIN SCREEN */
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-admin-amber/10 border border-admin-amber/20 flex items-center justify-center mx-auto text-admin-amber">
              <RefreshCw className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-admin-text">Change Default PIN</h3>
              <p className="text-xs text-admin-muted mt-1 leading-relaxed">
                You are using the default password PIN. You must customize your security PIN to unlock portal features.
              </p>
            </div>

            {errorMessage && (
              <div className="bg-admin-danger/10 border border-admin-danger/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4 text-left">
              {/* New PIN box list */}
              <div>
                <label className="text-[10px] uppercase font-bold text-admin-muted tracking-wider mb-2 block">
                  New 6-Digit PIN
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {newPinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (newPinRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleDigitChange(e.target.value, idx, newPinDigits, setNewPinDigits, newPinRefs, () => {})}
                      onKeyDown={(e) => handleDigitKeyDown(e, idx, newPinDigits, setNewPinDigits, newPinRefs)}
                      style={{ WebkitTextSecurity: 'disc' }}
                      autoComplete="one-time-code"
                      className="w-full aspect-square text-center font-bold text-lg rounded-xl glass-input border border-admin-border focus:border-admin-amber text-admin-text"
                    />
                  ))}
                </div>
              </div>

              {/* Confirm PIN box list */}
              <div>
                <label className="text-[10px] uppercase font-bold text-admin-muted tracking-wider mb-2 block">
                  Confirm PIN
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {newPinConfirm.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (confirmPinRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleDigitChange(e.target.value, idx, newPinConfirm, setNewPinConfirm, confirmPinRefs, () => {})}
                      onKeyDown={(e) => handleDigitKeyDown(e, idx, newPinConfirm, setNewPinConfirm, confirmPinRefs)}
                      style={{ WebkitTextSecurity: 'disc' }}
                      autoComplete="one-time-code"
                      className="w-full aspect-square text-center font-bold text-lg rounded-xl glass-input border border-admin-border focus:border-admin-amber text-admin-text"
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={submitPinChange}
              className="w-full admin-btn-primary py-3 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Update Security PIN</span>
            </button>
          </div>
        ) : recoveryStep === 'verify' ? (
          /* EMERGENCY VERIFY CODE SCREEN */
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center mx-auto text-admin-accent-hi">
              <RefreshCw className="w-7 h-7 animate-spin" style={{ animationDuration: '3s' }} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-admin-text">Verify Reset Code</h2>
              <p className="text-xs text-admin-muted px-4 leading-relaxed">
                Enter the 6-digit verification code sent to your registered email to change your Login PIN.
              </p>
            </div>

            {recoveryMessage && (
              <div className="bg-admin-accent/10 border border-admin-accent/25 text-admin-accent-hi px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="text-left font-medium leading-tight">{recoveryMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="bg-admin-danger/10 border border-admin-danger/25 text-red-400 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-left font-medium leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Inputs Box Grid */}
            <div className="grid grid-cols-6 gap-2.5 max-w-xs mx-auto">
              {recoveryDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (recoveryRefs.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, idx, recoveryDigits, setRecoveryDigits, recoveryRefs, handleResetConfirm)}
                  onKeyDown={(e) => handleDigitKeyDown(e, idx, recoveryDigits, setRecoveryDigits, recoveryRefs)}
                  style={{ WebkitTextSecurity: 'disc' }}
                  autoComplete="one-time-code"
                  className="w-full aspect-square text-center font-mono font-bold text-xl rounded-xl glass-input border border-admin-border text-admin-text"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => { setRecoveryStep(null); setErrorMessage(''); }}
                className="text-xs text-admin-muted hover:text-admin-text underline font-sans"
              >
                Cancel and Back to Login
              </button>
            </div>
          </div>
        ) : recoveryStep === 'new-pin' ? (
          /* EMERGENCY SETUP CUSTOM PIN SCREEN */
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-admin-amber/10 border border-admin-amber/20 flex items-center justify-center mx-auto text-admin-amber">
              <RefreshCw className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-admin-text">Create New PIN</h3>
              <p className="text-xs text-admin-muted mt-1 leading-relaxed">
                Verification successful. Choose a new secure 6-digit PIN to configure access to your portal.
              </p>
            </div>

            {errorMessage && (
              <div className="bg-admin-danger/10 border border-admin-danger/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4 text-left">
              {/* New PIN box list */}
              <div>
                <label className="text-[10px] uppercase font-bold text-admin-muted tracking-wider mb-2 block">
                  New 6-Digit PIN
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {recoveryPinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (recoveryPinRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleDigitChange(e.target.value, idx, recoveryPinDigits, setRecoveryPinDigits, recoveryPinRefs, () => {})}
                      onKeyDown={(e) => handleDigitKeyDown(e, idx, recoveryPinDigits, setRecoveryPinDigits, recoveryPinRefs)}
                      style={{ WebkitTextSecurity: 'disc' }}
                      autoComplete="one-time-code"
                      className="w-full aspect-square text-center font-bold text-lg rounded-xl glass-input border border-admin-border focus:border-admin-amber text-admin-text"
                    />
                  ))}
                </div>
              </div>

              {/* Confirm PIN box list */}
              <div>
                <label className="text-[10px] uppercase font-bold text-admin-muted tracking-wider mb-2 block">
                  Confirm New PIN
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {recoveryPinConfirm.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (recoveryPinConfirmRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleDigitChange(e.target.value, idx, recoveryPinConfirm, setRecoveryPinConfirm, recoveryPinConfirmRefs, () => {})}
                      onKeyDown={(e) => handleDigitKeyDown(e, idx, recoveryPinConfirm, setRecoveryPinConfirm, recoveryPinConfirmRefs)}
                      style={{ WebkitTextSecurity: 'disc' }}
                      autoComplete="one-time-code"
                      className="w-full aspect-square text-center font-bold text-lg rounded-xl glass-input border border-admin-border focus:border-admin-amber text-admin-text"
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => submitRecoveryPin(recoveryPinDigits.join(''))}
              className="w-full admin-btn-primary py-3 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Update Portal PIN</span>
            </button>
          </div>
        ) : (
          /* STANDARD PIN ENTRY LOGIN SCREEN */
          <div className="space-y-6">
            {/* Lock/Unlock animated icon */}
            <motion.div
              animate={lockIconAnimation}
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border transition-colors duration-300 ${
                successMode 
                  ? 'bg-admin-accent/10 border-admin-accent/20 text-admin-accent-hi' 
                  : 'bg-white/5 border-admin-border text-admin-text'
              }`}
            >
              {successMode ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
            </motion.div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-admin-text">Enter Security PIN</h2>
              <p className="text-xs text-admin-muted">Please insert the 6-digit unlock PIN below.</p>
            </div>

            {errorMessage && (
              <div className="bg-admin-danger/10 border border-admin-danger/25 text-red-400 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-left font-medium leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Inputs Box Grid */}
            <div className="grid grid-cols-6 gap-2.5 max-w-xs mx-auto">
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, idx, pinDigits, setPinDigits, inputRefs, submitLogin)}
                  onKeyDown={(e) => handleDigitKeyDown(e, idx, pinDigits, setPinDigits, inputRefs)}
                  style={{ WebkitTextSecurity: 'disc' }}
                  autoComplete="one-time-code"
                  className="w-full aspect-square text-center font-mono font-bold text-xl rounded-xl glass-input border border-admin-border text-admin-text"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {wrongAttempts > 0 && (
              <p className="text-[11px] text-admin-amber/80 font-medium">
                Incorrect attempts: {wrongAttempts} / 5. Portal will lock after 5 failures.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2">
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
                  'Forgot PIN?'
                )}
              </button>
              <p className="text-[10px] text-admin-muted">
                Note: Unlocked sessions automatically close after 5 minutes of inactivity.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
