import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSInput from '../components/ui/CMSInput';
import CMSTextarea from '../components/ui/CMSTextarea';
import CMSToggle from '../components/ui/CMSToggle';
import CMSDragList from '../components/ui/CMSDragList';
import { Plus, Trash2, MapPin, Mail, Phone, Settings as SettingsIcon, Send } from 'lucide-react';

export default function ContactEditor() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('headOffice');
  const [isDirty, setIsDirty] = useState(false);

  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);
  const pinHash = useAdminStore((state) => state.pinHash);

  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestSMTP = async () => {
    if (testingSmtp) return;
    setTestingSmtp(true);
    setTestResult(null);

    const smtpConfig = data?.formSettings || {};

    try {
      const res = await fetch('/api/email/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash || '',
        },
        body: JSON.stringify(smtpConfig),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setTestResult({ success: true, message: result.message });
      } else {
        setTestResult({ success: false, message: result.message || 'SMTP verification failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Failed to contact backend server.' });
    } finally {
      setTestingSmtp(false);
    }
  };

  useEffect(() => {
    const loaded = getSectionData('contact');
    setData(loaded);
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('contact', true);
  };

  const handleSave = () => {
    saveSection('contact', data);
    setIsDirty(false);
    setSectionDirty('contact', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('contact');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('contact', false);
  };

  // Change head office fields
  const handleHeadOfficeChange = (field, value) => {
    triggerChange({
      ...data,
      headOffice: {
        ...data.headOffice,
        [field]: value
      }
    });
  };

  // Change regional offices list
  const handleRegionalOfficeChange = (id, field, value) => {
    const updated = data.regionalOffices.map((office) => {
      if (office.id === id) {
        return { ...office, [field]: value };
      }
      return office;
    });
    triggerChange({ ...data, regionalOffices: updated });
  };

  const handleReorderOffices = (newList) => {
    triggerChange({ ...data, regionalOffices: newList });
  };

  const addOffice = () => {
    const newOffice = {
      id: `ro_${Date.now()}`,
      city: 'New City Office',
      address: 'Enter full office address details here.',
      phone: '+91 94150 12345',
      email: 'office@lakshyafordevelopment.org',
      active: true
    };
    triggerChange({ ...data, regionalOffices: [...data.regionalOffices, newOffice] });
  };

  const deleteOffice = (id) => {
    const filtered = data.regionalOffices.filter((o) => o.id !== id);
    triggerChange({ ...data, regionalOffices: filtered });
  };

  // Change form settings fields
  const handleFormSettingsChange = (field, value) => {
    triggerChange({
      ...data,
      formSettings: {
        ...data.formSettings,
        [field]: value
      }
    });
  };



  const handleRequiredFieldToggle = (fieldName) => {
    const currentRequired = data.formSettings.requiredFields || [];
    let updatedRequired;
    if (currentRequired.includes(fieldName)) {
      updatedRequired = currentRequired.filter(f => f !== fieldName);
    } else {
      updatedRequired = [...currentRequired, fieldName];
    }
    handleFormSettingsChange('requiredFields', updatedRequired);
  };

  // Change map settings
  const handleMapSettingsChange = (field, value) => {
    triggerChange({
      ...data,
      mapSettings: {
        ...data.mapSettings,
        [field]: value
      }
    });
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading contact info...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Settings Editor"
        description="Edit office locations, email endpoints for forms, Google Maps embeds, and required contact page form parameters."
      />

      {/* Tabs */}
      <div className="flex border-b border-admin-border gap-2 select-none">
        {[
          { id: 'headOffice', name: 'Head Office', icon: MapPin },
          { id: 'regionalOffices', name: 'Regional Offices', icon: Phone },
          { id: 'formSettings', name: 'Form Settings', icon: Mail },
          { id: 'smtpSettings', name: 'SMTP Setup', icon: Send },
          { id: 'mapSettings', name: 'Interactive Map', icon: SettingsIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-admin-accent text-admin-accent-hi'
                : 'border-transparent text-admin-muted hover:text-admin-text'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* TABS CONTENT VIEWPORT */}
      <div className="pt-2">
        
        {/* HEAD OFFICE */}
        {activeTab === 'headOffice' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] max-w-3xl space-y-4">
            <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Head Office Contact Info
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Address Line 1"
                value={data.headOffice?.address1 || ''}
                onChange={(val) => handleHeadOfficeChange('address1', val)}
                placeholder="12, Sector 8"
              />
              <CMSInput
                label="Address Line 2"
                value={data.headOffice?.address2 || ''}
                onChange={(val) => handleHeadOfficeChange('address2', val)}
                placeholder="Vikas Nagar"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="City, State, PIN"
                value={data.headOffice?.cityStatePin || ''}
                onChange={(val) => handleHeadOfficeChange('cityStatePin', val)}
                placeholder="Lucknow, Uttar Pradesh - 226022"
              />
              <CMSInput
                label="Office Working Hours"
                value={data.headOffice?.hours || ''}
                onChange={(val) => handleHeadOfficeChange('hours', val)}
                placeholder="Mon - Sat: 9:00 AM - 6:00 PM"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CMSInput
                label="Email Address"
                value={data.headOffice?.email || ''}
                onChange={(val) => handleHeadOfficeChange('email', val)}
                placeholder="info@lakshyafordevelopment.org"
              />
              <CMSInput
                label="WhatsApp Number (Optional)"
                value={data.headOffice?.whatsapp || ''}
                onChange={(val) => handleHeadOfficeChange('whatsapp', val)}
                placeholder="+91 94150 12345"
              />
            </div>
          </div>
        )}

        {/* REGIONAL OFFICES */}
        {activeTab === 'regionalOffices' && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between border-b border-admin-border pb-3">
              <span className="text-xs uppercase font-bold text-admin-muted tracking-wider">Regional Offices List</span>
              <button
                onClick={addOffice}
                className="flex items-center gap-1 admin-btn-secondary py-1 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Office</span>
              </button>
            </div>

            <CMSDragList
              items={data.regionalOffices || []}
              onReorder={handleReorderOffices}
              keyExtractor={(item) => item.id}
              renderItem={(office) => (
                <div className="space-y-3 text-left w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CMSInput
                      label="City Name"
                      value={office.city}
                      onChange={(val) => handleRegionalOfficeChange(office.id, 'city', val)}
                      maxLength={40}
                    />
                    <div className="flex items-end justify-between pb-1">
                      <CMSToggle
                        label="Active Branch"
                        checked={office.active}
                        onChange={(val) => handleRegionalOfficeChange(office.id, 'active', val)}
                      />
                      <button
                        onClick={() => deleteOffice(office.id)}
                        className="p-2.5 rounded-xl bg-admin-danger/10 border border-admin-border text-admin-danger hover:bg-admin-danger hover:text-white transition-colors"
                        title="Delete office"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CMSInput
                      label="Branch Address"
                      value={office.address || ''}
                      onChange={(val) => handleRegionalOfficeChange(office.id, 'address', val)}
                      placeholder="Street, locality, city and state..."
                    />
                    <CMSInput
                      label="Branch Email"
                      value={office.email || ''}
                      onChange={(val) => handleRegionalOfficeChange(office.id, 'email', val)}
                      placeholder="branch@lakshyafordevelopment.org"
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* FORM SETTINGS */}
        {activeTab === 'formSettings' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] max-w-3xl space-y-6">
            <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Visitor Contact Form Configurations
            </h3>

            <CMSInput
              label="Email Subject Prefix"
              value={data.formSettings?.subjectPrefix || ''}
              onChange={(val) => handleFormSettingsChange('subjectPrefix', val)}
              description="Prefix added to email subject titles (e.g. for Web3Forms or alerts)."
              placeholder="Lakshya Enquiry: "
            />

            <CMSTextarea
              label="Form Success Confirmation Alert"
              value={data.formSettings?.successMessage || ''}
              onChange={(val) => handleFormSettingsChange('successMessage', val)}
              maxLength={200}
              rows={2}
              description="Message displayed on screen after successful submit."
            />

            <div className="border-t border-admin-border pt-6 space-y-4">
              <div className="flex flex-col gap-1 max-w-md">
                <label className="text-xs font-bold text-admin-muted uppercase tracking-wider">
                  Email Delivery Service
                </label>
                <select
                  className="glass-input rounded-xl px-3 py-2.5 text-sm text-admin-text cursor-pointer w-full focus:outline-none focus:ring-1 focus:ring-admin-accent focus:border-admin-accent"
                  value={data.formSettings?.emailService || 'demo'}
                  onChange={(e) => handleFormSettingsChange('emailService', e.target.value)}
                >
                  <option value="demo">Simulation / Demo Mode (Browser Only)</option>
                  <option value="smtp">SMTP (Local Server Relay - Recommended)</option>
                  <option value="web3forms">Web3Forms (Simple Access Key)</option>
                  <option value="formspree">Formspree (Form ID)</option>
                  <option value="emailjs">EmailJS (Service, Template, Public Key)</option>
                  <option value="webhook">Custom Webhook / Private API (POST JSON)</option>
                </select>
                <span className="text-[10px] text-admin-muted/80 leading-normal mt-1">
                  Choose how submissions are sent. Note: Raw SMTP details are not configured directly here to prevent exposing password credentials in client-side code.
                </span>
              </div>

              {/* Dynamic Service Settings Fields */}
              {data.formSettings?.emailService === 'web3forms' && (
                <div className="grid grid-cols-1 gap-4 p-4 bg-admin-surface-2/20 rounded-2xl border border-admin-border">
                  <CMSInput
                    label="Web3Forms Access Key"
                    value={data.formSettings?.web3formsKey || ''}
                    onChange={(val) => handleFormSettingsChange('web3formsKey', val)}
                    placeholder="e.g. 12345678-abcd-1234-abcd-1234567890ab"
                    description="Create a free key at web3forms.com. Messages will go directly to your registered email address."
                  />
                </div>
              )}

              {data.formSettings?.emailService === 'formspree' && (
                <div className="grid grid-cols-1 gap-4 p-4 bg-admin-surface-2/20 rounded-2xl border border-admin-border">
                  <CMSInput
                    label="Formspree Form ID"
                    value={data.formSettings?.formspreeFormId || ''}
                    onChange={(val) => handleFormSettingsChange('formspreeFormId', val)}
                    placeholder="e.g. xpznvqwl"
                    description="Enter the unique form ID from your Formspree dashboard settings."
                  />
                </div>
              )}

              {data.formSettings?.emailService === 'emailjs' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-admin-surface-2/20 rounded-2xl border border-admin-border">
                  <CMSInput
                    label="EmailJS Service ID"
                    value={data.formSettings?.emailjsServiceId || ''}
                    onChange={(val) => handleFormSettingsChange('emailjsServiceId', val)}
                    placeholder="e.g. service_xxxxxx"
                  />
                  <CMSInput
                    label="EmailJS Template ID"
                    value={data.formSettings?.emailjsTemplateId || ''}
                    onChange={(val) => handleFormSettingsChange('emailjsTemplateId', val)}
                    placeholder="e.g. template_xxxxxx"
                  />
                  <CMSInput
                    label="EmailJS Public Key"
                    value={data.formSettings?.emailjsPublicKey || ''}
                    onChange={(val) => handleFormSettingsChange('emailjsPublicKey', val)}
                    placeholder="e.g. user_xxxxxxxxx"
                  />
                </div>
              )}

              {data.formSettings?.emailService === 'webhook' && (
                <div className="grid grid-cols-1 gap-4 p-4 bg-admin-surface-2/20 rounded-2xl border border-admin-border">
                  <CMSInput
                    label="Custom Webhook URL"
                    value={data.formSettings?.webhookUrl || ''}
                    onChange={(val) => handleFormSettingsChange('webhookUrl', val)}
                    placeholder="https://your-server-api.com/send-email"
                    description="A POST request with the JSON payload of the contact form data will be forwarded here."
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 bg-admin-surface-2/40 p-4 rounded-2xl border border-admin-border">
              <label className="text-xs font-bold text-admin-muted uppercase tracking-wider block">
                Required Form Fields Settings
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['name', 'email', 'phone', 'subject', 'message'].map((f) => {
                  const isReq = (data.formSettings?.requiredFields || []).includes(f);
                  return (
                    <label key={f} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isReq}
                        onChange={() => handleRequiredFieldToggle(f)}
                        className="rounded border-admin-border text-admin-accent focus:ring-admin-accent bg-admin-surface"
                      />
                      <span className="text-xs text-admin-text font-medium capitalize">{f}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MAP SETTINGS */}
        {activeTab === 'mapSettings' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] max-w-3xl space-y-6">
            <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Google Maps Interactive Embed Settings
            </h3>

            <CMSTextarea
              label="Google Maps iframe Embed Source URL"
              value={data.mapSettings?.embedUrl || ''}
              onChange={(val) => handleMapSettingsChange('embedUrl', val)}
              rows={3}
              placeholder="Paste Google Maps iframe link src URL here..."
              description="Navigate to Google Maps, search, click 'Share' -> 'Embed a map' and copy ONLY the 'src' attribute value from the iframe tag."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Map Marker Label"
                value={data.mapSettings?.markerLabel || ''}
                onChange={(val) => handleMapSettingsChange('markerLabel', val)}
                placeholder="Vikas Nagar Office"
              />

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-admin-muted uppercase tracking-wider">Default Map Zoom</span>
                  <span className="font-mono text-admin-accent-hi font-bold">{data.mapSettings?.zoom || 15}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="18"
                  value={data.mapSettings?.zoom || 15}
                  onChange={(e) => handleMapSettingsChange('zoom', parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-admin-surface rounded-lg appearance-none cursor-pointer accent-admin-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* SMTP SETTINGS */}
        {activeTab === 'smtpSettings' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] max-w-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-admin-border pb-3">
              <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider">
                SMTP Server & Auto-Responder Setup
              </h3>
              <CMSToggle
                label="Activate SMTP Service"
                checked={data.formSettings?.smtpEnabled === true}
                onChange={(val) => handleFormSettingsChange('smtpEnabled', val)}
              />
            </div>

            <p className="text-xs text-admin-muted leading-relaxed">
              Setting up a local SMTP Server enables sending automatic confirmation emails (auto-responders) to applicants and visitors.
            </p>

            {/* Only show configuration inputs if SMTP is activated */}
            {data.formSettings?.smtpEnabled === true ? (
              <div className="space-y-6 text-left">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CMSInput
                    label="Destination Email Inbox"
                    value={data.formSettings?.destinationEmail || ''}
                    onChange={(val) => handleFormSettingsChange('destinationEmail', val)}
                    placeholder="e.g. info@lakshyafordevelopment.org"
                    description="The inbox where contact submissions & applications will be delivered via SMTP."
                    type="email"
                  />
                  <CMSInput
                    label="Sender / From Email"
                    value={data.formSettings?.smtpFrom || ''}
                    onChange={(val) => handleFormSettingsChange('smtpFrom', val)}
                    placeholder="e.g. info@lakshyafordevelopment.org"
                    description="Must be a verified sender domain in your SMTP provider (e.g. Mailercloud or Brevo)."
                    type="email"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CMSInput
                    label="SMTP Server Host"
                    value={data.formSettings?.smtpHost || ''}
                    onChange={(val) => handleFormSettingsChange('smtpHost', val)}
                    placeholder="e.g. smtp.gmail.com"
                  />
                  <CMSInput
                    label="SMTP Server Port"
                    value={data.formSettings?.smtpPort || '465'}
                    onChange={(val) => handleFormSettingsChange('smtpPort', val)}
                    placeholder="e.g. 465 or 587"
                  />
                  <div className="flex items-center justify-between p-2 mt-1">
                    <CMSToggle
                      label="SMTP TLS Secure"
                      checked={data.formSettings?.smtpSecure !== false}
                      onChange={(val) => handleFormSettingsChange('smtpSecure', val)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CMSInput
                    label="SMTP Server Username"
                    value={data.formSettings?.smtpUser || ''}
                    onChange={(val) => handleFormSettingsChange('smtpUser', val)}
                    placeholder="e.g. alert@gmail.com"
                  />
                  <CMSInput
                    label="SMTP Server Password"
                    value={data.formSettings?.smtpPass || ''}
                    onChange={(val) => handleFormSettingsChange('smtpPass', val)}
                    placeholder="App password / SMTP Secret"
                    type="text"
                    style={{ WebkitTextSecurity: 'disc' }}
                    autoComplete="new-password"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={testingSmtp}
                    onClick={handleTestSMTP}
                    className="admin-btn-primary flex items-center justify-center gap-2 py-2.5 px-6 text-xs font-semibold select-none disabled:opacity-50"
                  >
                    {testingSmtp ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Testing SMTP Connection...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Test SMTP Connection</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-admin-muted leading-tight max-w-sm text-left">
                    Verifies connections and credentials by sending a live test message to your Destination Email Inbox.
                  </span>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-xl border text-xs text-left flex gap-3 ${
                    testResult.success 
                      ? 'bg-admin-accent/5 border-admin-accent/20 text-admin-accent-hi' 
                      : 'bg-admin-danger/5 border-admin-danger/20 text-red-400'
                  }`}>
                    <div className="font-sans leading-relaxed flex-1">
                      <strong className="block font-bold mb-1">
                        {testResult.success ? '✓ SMTP Verification Successful' : '✗ SMTP Connection Failed'}
                      </strong>
                      <span>{testResult.message}</span>
                    </div>
                  </div>
                )}
                
                {/* Autoresponder Settings */}
                <div className="border-t border-white/5 pt-4 space-y-6">
                  <h4 className="text-xs font-bold text-admin-muted uppercase tracking-wider border-b border-admin-border pb-2">
                    Auto-Response Email Templates (Sent back to visitors)
                  </h4>
                  
                  {/* 1. Volunteer Autoresponder */}
                  <div className="space-y-3 bg-white/[0.01] p-4 rounded-xl border border-admin-border">
                    <h5 className="text-xs font-semibold text-admin-text uppercase">
                      1. Volunteer Application Auto-Response
                    </h5>
                    <CMSInput
                      label="Email Subject"
                      value={data.formSettings?.candidateSubject || ''}
                      onChange={(val) => handleFormSettingsChange('candidateSubject', val)}
                      placeholder="e.g. Application Received: [Job Title]"
                      description="Supported placeholders: [Name], [Job Title]"
                    />
                    <CMSTextarea
                      label="Email Body Content"
                      value={data.formSettings?.candidateBody || ''}
                      onChange={(val) => handleFormSettingsChange('candidateBody', val)}
                      placeholder="e.g. Dear [Name], we have received your application..."
                      rows={4}
                      description="Plaintext template sent automatically back to the volunteer applicant."
                    />
                  </div>

                  {/* 2. Contact Us enquiry Autoresponder */}
                  <div className="space-y-3 bg-white/[0.01] p-4 rounded-xl border border-admin-border">
                    <h5 className="text-xs font-semibold text-admin-text uppercase">
                      2. Contact Inquiry Auto-Response
                    </h5>
                    <CMSInput
                      label="Email Subject"
                      value={data.formSettings?.enquirySubject || ''}
                      onChange={(val) => handleFormSettingsChange('enquirySubject', val)}
                      placeholder="e.g. Thank you for contacting Lakshya NGO"
                      description="Supported placeholders: [Name], [Subject]"
                    />
                    <CMSTextarea
                      label="Email Body Content"
                      value={data.formSettings?.enquiryBody || ''}
                      onChange={(val) => handleFormSettingsChange('enquiryBody', val)}
                      placeholder="e.g. Dear [Name], thank you for reaching out to us..."
                      rows={4}
                      description="Plaintext template sent automatically back to the visitor who sent a message."
                    />
                  </div>

                  {/* 3. Newsletter Subscription Autoresponder */}
                  <div className="space-y-3 bg-white/[0.01] p-4 rounded-xl border border-admin-border">
                    <h5 className="text-xs font-semibold text-admin-text uppercase">
                      3. Newsletter Subscription welcome email
                    </h5>
                    <CMSInput
                      label="Email Subject"
                      value={data.formSettings?.newsletterSubject || ''}
                      onChange={(val) => handleFormSettingsChange('newsletterSubject', val)}
                      placeholder="e.g. Welcome to Lakshya NGO Newsletter!"
                      description="No name placeholder supported (as footer sign-up only collects email address)."
                    />
                    <CMSTextarea
                      label="Email Body Content"
                      value={data.formSettings?.newsletterBody || ''}
                      onChange={(val) => handleFormSettingsChange('newsletterBody', val)}
                      placeholder="e.g. Thank you for subscribing to our newsletter..."
                      rows={4}
                      description="Plaintext template sent automatically back to the newsletter subscriber."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 border border-dashed border-admin-border rounded-xl text-center text-admin-muted text-sm">
                SMTP email delivery is currently disabled. Toggle it on above to configure your credentials.
              </div>
            )}
          </div>
        )}
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Contact Settings"
      />
    </div>
  );
}
