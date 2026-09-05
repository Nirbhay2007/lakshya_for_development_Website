import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSInput from '../components/ui/CMSInput';
import CMSTextarea from '../components/ui/CMSTextarea';
import CMSToggle from '../components/ui/CMSToggle';
import CMSDragList from '../components/ui/CMSDragList';
import CMSImageUpload from '../components/ui/CMSImageUpload';
import CMSModal from '../components/ui/CMSModal';
import LocalQRCode from '../components/ui/LocalQRCode';
import { Plus, Trash2, Eye, EyeOff, ShieldCheck, AlertTriangle, Copy, Download, QrCode } from 'lucide-react';

export default function DonateEditor() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('hero');
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  // Security layer for bank details
  const [bankUnlocked, setBankUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [verifyPinDigits, setVerifyPinDigits] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');

  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);
  const pinInputRefs = React.useRef([]);

  useEffect(() => {
    const loaded = getSectionData('donate');
    setData(loaded);
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('donate', true);
  };

  const handleSave = () => {
    saveSection('donate', data);
    setIsDirty(false);
    setSectionDirty('donate', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('donate');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('donate', false);
    setBankUnlocked(false);
  };

  // Change hero fields
  const handleHeroChange = (field, value) => {
    triggerChange({
      ...data,
      hero: {
        ...data.hero,
        [field]: value
      }
    });
  };

  // Change preset amounts
  const handlePresetChange = (index, field, value) => {
    const updated = data.presets.map((preset, i) => {
      if (i === index) {
        return { ...preset, [field]: value };
      }
      return preset;
    });
    triggerChange({ ...data, presets: updated });
  };

  const handleReorderPresets = (newList) => {
    triggerChange({ ...data, presets: newList });
  };

  const addPreset = () => {
    if (data.presets.length >= 8) {
      alert('Maximum of 8 donation purposes allowed');
      return;
    }
    const newPreset = {
      id: `p${Date.now().toString().slice(-4)}`,
      title: 'New Donation Cause',
      label: 'Description of where funds will be allocated',
      amount: 0,
      icon: 'Heart',
      highlighted: false,
      redirectUrl: ''
    };
    triggerChange({ ...data, presets: [...data.presets, newPreset] });
  };

  const deletePreset = () => {
    const filtered = data.presets.filter((_, i) => i !== deleteConfirmIdx);
    triggerChange({ ...data, presets: filtered });
    setDeleteConfirmIdx(null);
  };

  // Change UPI settings
  const handleUpiChange = (field, value) => {
    triggerChange({
      ...data,
      upi: {
        ...data.upi,
        [field]: value
      }
    });
  };

  // Change bank transfer settings
  const handleBankChange = (field, value) => {
    triggerChange({
      ...data,
      bankTransfer: {
        ...data.bankTransfer,
        [field]: value
      }
    });
  };

  // Change global donation page settings
  const handleSettingsChange = (field, value) => {
    triggerChange({
      ...data,
      settings: {
        ...data.settings,
        [field]: value
      }
    });
  };

  // Change payment gateways settings
  const handleGatewayChange = (pathStr, field, value) => {
    const gateways = data.gateways || {};
    if (pathStr === 'activeGateway') {
      triggerChange({
        ...data,
        gateways: {
          ...gateways,
          activeGateway: value
        }
      });
      return;
    }

    triggerChange({
      ...data,
      gateways: {
        ...gateways,
        [pathStr]: {
          ...(gateways[pathStr] || {}),
          [field]: value
        }
      }
    });
  };

  // Lock verify digits handle focus
  const handlePinDigitChange = async (value, index, digits) => {
    const cleanValue = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setVerifyPinDigits(newDigits);

    if (cleanValue && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    } else if (cleanValue && index === 5) {
      // Submit code verification via server API
      const pinString = newDigits.join('');
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinString })
        });
        const result = await response.json();
        
        if (result.success) {
          setBankUnlocked(true);
          setIsPinModalOpen(false);
          setPinError('');
        } else {
          setPinError(result.message || 'Incorrect PIN. Security access denied.');
          setVerifyPinDigits(['', '', '', '', '', '']);
          pinInputRefs.current[0]?.focus();
        }
      } catch {
        setPinError('Server unavailable. Please try again.');
        setVerifyPinDigits(['', '', '', '', '', '']);
        pinInputRefs.current[0]?.focus();
      }
    }
  };

  const handlePinKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!verifyPinDigits[index] && index > 0) {
        const newDigits = [...verifyPinDigits];
        newDigits[index - 1] = '';
        setVerifyPinDigits(newDigits);
        pinInputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...verifyPinDigits];
        newDigits[index] = '';
        setVerifyPinDigits(newDigits);
      }
    }
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading donate page...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donate Page Editor"
        description="Configure preset donation thresholds, UPI QR code images, account credentials, and tax deduction 80G legal notices."
      />

      {/* Tabs list bar */}
      <div className="flex border-b border-admin-border gap-2 select-none">
        {[
          { id: 'hero', name: 'Hero Banner' },
          { id: 'presets', name: 'Donation Purposes' },
          { id: 'gateways', name: 'Payment Gateways' },
          { id: 'settings', name: 'Form & Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
            }}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-admin-accent text-admin-accent-hi'
                : 'border-transparent text-admin-muted hover:text-admin-text'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* TABS VIEWPORT */}
      <div className="pt-2">

        {/* HERO BANNER */}
        {activeTab === 'hero' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <CMSImageUpload
                label="Hero Background Image"
                value={data.hero?.bgImage || data.hero?.image || ''}
                onChange={(val) => handleHeroChange('bgImage', val)}
                description="Cover banner photo shown in top donation segment."
              />
            </div>
            <div className="space-y-4">
              <CMSInput
                label="Hero Headline Title"
                value={data.hero?.title || ''}
                onChange={(val) => handleHeroChange('title', val)}
                maxLength={60}
              />
              <CMSTextarea
                label="Hero Subtext"
                value={data.hero?.subtitle || ''}
                onChange={(val) => handleHeroChange('subtitle', val)}
                maxLength={150}
                rows={3}
              />
              <CMSInput
                label="Action CTA Button Label"
                value={data.hero?.ctaText || ''}
                onChange={(val) => handleHeroChange('ctaText', val)}
                maxLength={20}
              />
            </div>
          </div>
        )}

        {/* DONATION PURPOSES */}
        {activeTab === 'presets' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between border-b border-admin-border pb-3">
              <span className="text-xs uppercase font-bold text-admin-muted tracking-wider">Drag to Reorder Donation Causes</span>
              <button
                onClick={addPreset}
                disabled={data.presets?.length >= 8}
                className="flex items-center gap-1 admin-btn-secondary py-1 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Cause</span>
              </button>
            </div>

            <CMSDragList
              items={data.presets || []}
              onReorder={handleReorderPresets}
              keyExtractor={(item, index) => index}
              renderItem={(preset, index) => {
                const causeId = preset.id || `p${index + 1}`;
                const causeUrl = `${window.location.origin}/donate?cause=${encodeURIComponent(causeId)}`;

                return (
                  <div className="space-y-4 w-full p-1">
                    <div className="flex flex-col sm:flex-row gap-3 items-start justify-between w-full">
                      <div className="space-y-3 flex-1 w-full text-left">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <CMSInput
                            label="🔒 Permanent Poster ID (Unchangeable)"
                            value={preset.id || `p${index + 1}`}
                            readOnly
                            disabled
                            className="opacity-75 cursor-not-allowed font-mono"
                            description="Immutable ID encoded in physical poster QR codes"
                          />
                          <CMSInput
                            label="Cause Title / Purpose Name"
                            placeholder="e.g. Childhood Education"
                            value={preset.title || preset.name || ''}
                            onChange={(val) => handlePresetChange(index, 'title', val)}
                          />
                          <CMSInput
                            label="Impact Allocation Description"
                            placeholder="e.g. Supplies notebooks & study kits"
                            value={preset.label || ''}
                            onChange={(val) => handlePresetChange(index, 'label', val)}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <CMSInput
                            label="Fixed Amount ₹ (0 = Custom Amount)"
                            type="number"
                            placeholder="0 for custom"
                            value={preset.amount !== undefined ? preset.amount : ''}
                            onChange={(val) => handlePresetChange(index, 'amount', parseInt(val, 10) || 0)}
                          />
                          <CMSInput
                            label="Success Redirect / WhatsApp"
                            placeholder="e.g. https://wa.me/..."
                            value={preset.redirectUrl || ''}
                            onChange={(val) => handlePresetChange(index, 'redirectUrl', val)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-6 w-full sm:w-auto">
                        <CMSToggle
                          label="Featured"
                          checked={preset.highlighted || preset.highlight || false}
                          onChange={(val) => handlePresetChange(index, 'highlighted', val)}
                        />
                        
                        <button
                          onClick={() => setDeleteConfirmIdx(index)}
                          className="p-2 rounded-xl bg-admin-danger/10 border border-admin-danger/25 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors shrink-0 font-semibold cursor-pointer"
                          title="Delete Cause"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>

                    {/* 100% Offline Local QR Code & Poster Link Generator */}
                    <LocalQRCode
                      value={causeUrl}
                      title={preset.title || preset.name || 'cause'}
                      filename={`QR_Lakshya_${(preset.title || preset.id || 'cause').replace(/[^a-zA-Z0-9]+/g, '_')}.png`}
                    />
                  </div>
                );
              }}
            />
          </div>
        )}

        {/* PAYMENT GATEWAYS */}
        {activeTab === 'gateways' && (
          <div className="space-y-6 max-w-4xl font-sans text-left">

            {/* RAZORPAY CONFIGURATION */}
            <div className="glass-panel p-6 rounded-2xl border border-admin-accent/30 space-y-4 shadow-xl">
              <div className="border-b border-admin-border pb-3">
                <h3 className="text-sm uppercase font-bold text-admin-accent-hi tracking-wider">
                  Razorpay Merchant Credentials
                </h3>
                <p className="text-[11px] text-admin-muted mt-0.5">Configure your Razorpay API Key ID &amp; Secret Key for accepting online donations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <CMSInput
                  label="Display Merchant / Organization Name"
                  placeholder="Lakshya A Society for Social and Environmental Development"
                  value={data.gateways?.razorpay?.merchantName || ''}
                  onChange={(val) => handleGatewayChange('razorpay', 'merchantName', val)}
                  description="Shown at top of Razorpay payment modal."
                />
                <CMSInput
                  label="Razorpay Key ID"
                  placeholder="rzp_test_5Xv8N9qZ1Y2a3b"
                  value={data.gateways?.razorpay?.keyId || ''}
                  onChange={(val) => handleGatewayChange('razorpay', 'keyId', val)}
                />
                <CMSInput
                  label="Razorpay Key Secret (For HMAC Verification)"
                  type="password"
                  placeholder="Secret Key"
                  value={data.gateways?.razorpay?.keySecret || ''}
                  onChange={(val) => handleGatewayChange('razorpay', 'keySecret', val)}
                />
                <CMSInput
                  label="Modal Brand Theme Color"
                  placeholder="#044e37"
                  value={data.gateways?.razorpay?.themeColor || '#044e37'}
                  onChange={(val) => handleGatewayChange('razorpay', 'themeColor', val)}
                  description="Hex color for modal header & buttons."
                />
              </div>
              <p className="text-[11px] text-admin-muted pt-1">
                Tip: Get your free test keys instantly from <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-admin-accent-hi hover:underline font-semibold">Razorpay Dashboard &#x27A1; Account &amp; Settings &#x27A1; API Keys</a>.
              </p>
            </div>

            {/* DIRECT UPI DETAILS */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-4 shadow-xl">
              <div className="border-b border-admin-border pb-3">
                <h3 className="text-sm uppercase font-bold text-admin-text tracking-wider">
                  Direct UPI ID &amp; VPA Credentials
                </h3>
                <p className="text-[11px] text-admin-muted mt-0.5">Configure your direct UPI VPA address for instant GPay/PhonePe transfer display.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <CMSInput
                  label="Direct UPI ID (VPA)"
                  placeholder="lakshya.society@upi"
                  value={data.upi?.upiId || ''}
                  onChange={(val) => handleUpiChange('upiId', val)}
                  description="e.g. lakshya@sbi or lakshya.society@upi"
                />
                <CMSInput
                  label="UPI Display Beneficiary Name"
                  placeholder="Lakshya A Society for Social and Environmental Development"
                  value={data.upi?.displayName || ''}
                  onChange={(val) => handleUpiChange('displayName', val)}
                />
              </div>
            </div>

            {/* DIRECT BANK ACCOUNT DETAILS */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-4 shadow-xl">
              <div className="border-b border-admin-border pb-3">
                <h3 className="text-sm uppercase font-bold text-admin-text tracking-wider">
                  Direct Bank Account Transfer Details
                </h3>
                <p className="text-[11px] text-admin-muted mt-0.5">Configure official NGO bank account details for RTGS / NEFT / IMPS transfers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <CMSInput
                  label="Account Holder Name"
                  placeholder="Lakshya Society for Social &amp; Environmental Development"
                  value={data.bankTransfer?.accountName || ''}
                  onChange={(val) => handleBankChange('accountName', val)}
                />
                <CMSInput
                  label="Bank Account Number"
                  placeholder="123456789012"
                  value={data.bankTransfer?.accountNumber || ''}
                  onChange={(val) => handleBankChange('accountNumber', val)}
                />
                <CMSInput
                  label="Bank Name"
                  placeholder="State Bank of India"
                  value={data.bankTransfer?.bankName || ''}
                  onChange={(val) => handleBankChange('bankName', val)}
                />
                <CMSInput
                  label="IFSC Code"
                  placeholder="SBIN0001234"
                  value={data.bankTransfer?.ifscCode || ''}
                  onChange={(val) => handleBankChange('ifscCode', val)}
                />
                <CMSInput
                  label="Branch Name &amp; Location"
                  placeholder="Vikas Nagar, Lucknow"
                  value={data.bankTransfer?.branch || ''}
                  onChange={(val) => handleBankChange('branch', val)}
                />
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS AND REDIRECTS */}
        {activeTab === 'settings' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] max-w-3xl space-y-6">
            <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Donation settings & tax exclusions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSToggle
                label="Enable Checkout Form"
                description="Toggle donation input dialogs"
                checked={data.settings?.enableForm !== false}
                onChange={(val) => handleSettingsChange('enableForm', val)}
              />
              
              <CMSInput
                label="Successful Redirect URL (Optional)"
                placeholder="/thank-you"
                value={data.settings?.redirectUrl || ''}
                onChange={(val) => handleSettingsChange('redirectUrl', val)}
              />
            </div>

            <CMSTextarea
              label="Successful Payment Screen Note"
              value={data.settings?.thankYouMessage || ''}
              onChange={(val) => handleSettingsChange('thankYouMessage', val)}
              maxLength={200}
              rows={2}
            />

            <CMSTextarea
              label="80G Tax Deductible Legal Clause / Notice"
              value={data.settings?.taxNote || ''}
              onChange={(val) => handleSettingsChange('taxNote', val)}
              maxLength={300}
              rows={3}
              placeholder="All donations made to Lakshya Society are tax deductible under Section 80G..."
            />
          </div>
        )}
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Donations Settings"
      />

      {/* Preset Deletion Confirmation Modal */}
      <CMSModal
        isOpen={deleteConfirmIdx !== null}
        onClose={() => setDeleteConfirmIdx(null)}
        title="Delete Preset Warning"
        actions={
          <>
            <button
              onClick={() => setDeleteConfirmIdx(null)}
              className="admin-btn-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={deletePreset}
              className="admin-btn-danger py-1.5 text-xs"
            >
              Delete Preset
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this preset donation amount option? It will be removed from display. You must save changes below to commit.</p>
      </CMSModal>

      {/* PIN Unlock verification modal */}
      <CMSModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title="Confirm Portal Security PIN"
      >
        <div className="space-y-5 text-center">
          <p className="text-xs text-admin-muted">Please insert the 6-digit administrative PIN to unlock sensitive bank configurations.</p>
          
          {pinError && (
            <div className="bg-admin-danger/10 border border-admin-danger/25 text-red-400 p-2.5 rounded-xl text-xs flex items-center gap-1.5 justify-center">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{pinError}</span>
            </div>
          )}

          {/* Grid PIN inputs */}
          <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
            {verifyPinDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (pinInputRefs.current[idx] = el)}
                type="text"
                maxLength={1}
                pattern="[0-9]*"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handlePinDigitChange(e.target.value, idx, verifyPinDigits)}
                onKeyDown={(e) => handlePinKeyDown(e, idx)}
                style={{ WebkitTextSecurity: 'disc' }}
                autoComplete="one-time-code"
                className="w-full aspect-square text-center font-mono font-bold text-lg rounded-xl glass-input border border-admin-border text-admin-text"
                autoFocus={idx === 0}
              />
            ))}
          </div>
        </div>
      </CMSModal>
    </div>
  );
}
