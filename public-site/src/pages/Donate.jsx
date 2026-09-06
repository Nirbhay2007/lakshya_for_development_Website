import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Heart, BookOpen, Leaf, Check, Info, Activity, Sparkles, X, ShieldCheck, CheckCircle2, ExternalLink, MessageCircle, AlertTriangle, RefreshCw, Download, Copy, QrCode, Landmark } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import { useCMSData } from '../hooks/useCMSData';

const iconMap = {
  Leaf: <Leaf className="w-6 h-6 text-forest-600" />,
  Activity: <Activity className="w-6 h-6 text-amber-500" />,
  BookOpen: <BookOpen className="w-6 h-6 text-earth-500" />,
};

const formatRedirectUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const Donate = () => {
  const [amount, setAmount] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [frequency, setFrequency] = useState('one-time'); // 'one-time' | 'monthly'
  const [claim80g, setClaim80g] = useState(false);
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', panNumber: '', address: '' });
  
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedIfsc, setCopiedIfsc] = useState(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState({ name: '', amount: '', purpose: '', redirectUrl: '', id: '', transactionRef: '', receiptNumber: '', claim80g: false });
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    let timer;
    let interval;

    if (showSuccessModal && successDetails.redirectUrl) {
      setRedirectCountdown(3);

      interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timer = setTimeout(() => {
        const rawTarget = (successDetails.redirectUrl || '').trim();
        if (rawTarget.startsWith('/') || rawTarget.startsWith('http://') || rawTarget.startsWith('https://')) {
          window.location.href = rawTarget;
        }
      }, 3000);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [showSuccessModal, successDetails.redirectUrl]);

  const donateData = useCMSData('donate') || { hero: {}, whyDonate: [], presets: [], settings: {} };
  const hero = donateData.hero || {};
  const whyDonateList = donateData.whyDonate || [];
  const presets = Array.isArray(donateData.presets) ? donateData.presets : [];
  const settings = donateData.settings || {};

  // Auto-select cause preset and scroll to form if URL contains ?cause=... or ?preset=...
  React.useEffect(() => {
    if (!presets || presets.length === 0) return;

    const searchParams = new URLSearchParams(window.location.search);
    const paramCause = searchParams.get('cause') || searchParams.get('preset') || searchParams.get('id');

    if (paramCause) {
      const targetQuery = paramCause.trim().toLowerCase();
      const matched = presets.find((p) => {
        const idMatch = p.id && String(p.id).toLowerCase() === targetQuery;
        const titleMatch = (p.title || p.name || '').toLowerCase() === targetQuery;
        const slugMatch = (p.title || p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === targetQuery;
        return idMatch || titleMatch || slugMatch;
      });

      if (matched) {
        const matchedTitle = matched.title || matched.name || 'General Support';
        setSelectedPurpose(matchedTitle);
        if (matched.amount && Number(matched.amount) > 0) {
          setAmount(matched.amount.toString());
        }

        // Smooth scroll straight down to donation form
        setTimeout(() => {
          const formElement = document.getElementById('donation-form');
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 350);
      }
    }
  }, [donateData]);

  // Find currently selected preset object
  const selectedPresetObj = presets.find(p => (p.title || p.name || 'General Support') === selectedPurpose);
  const isFixedAmount = Boolean(selectedPresetObj && selectedPresetObj.amount && Number(selectedPresetObj.amount) > 0);

  const handleSelectPreset = (preset) => {
    const title = preset.title || preset.name || 'General Support';
    if (selectedPurpose === title) {
      // Deselect cause
      setSelectedPurpose('');
      if (isFixedAmount) {
        setAmount('');
      }
      return;
    }

    setSelectedPurpose(title);
    if (preset.amount !== undefined && Number(preset.amount) > 0) {
      setAmount(preset.amount.toString());
    }
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^[0-9\b]+$/.test(val)) {
      setAmount(val);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const razorpayConfig = donateData.gateways?.razorpay || {};

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleDonateSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid donation amount.');
      return;
    }
    if (numAmount > 500000) {
      alert('Maximum online donation per transaction is ₹5,00,000 (5 Lakhs). For larger contributions, please contact our team directly.');
      return;
    }

    if (!formState.name || !formState.name.trim()) {
      alert('Please enter your full name.');
      return;
    }
    if (!formState.phone || !formState.phone.trim()) {
      alert('Please enter your mobile phone number.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formState.email && formState.email.trim() && !emailRegex.test(formState.email.trim())) {
      alert('Please enter a valid email address or leave it blank.');
      return;
    }

    if (claim80g) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!formState.panNumber || !panRegex.test(formState.panNumber.trim().toUpperCase())) {
        alert('Please enter a valid 10-character Indian PAN Number (e.g. ABCDE1234F) to claim 80G tax deduction.');
        return;
      }
      if (!formState.address || formState.address.trim().length < 5) {
        alert('Please enter your full postal address as required by the Income Tax Department for 80G Form 10BD.');
        return;
      }
      if (!formState.email || !formState.email.trim()) {
        alert('Please provide an email address so we can dispatch your 80G certificate.');
        return;
      }
    }

    const purposeName = selectedPurpose || 'General NGO Support';

    // Razorpay Payment Flow
    const razorKey = (razorpayConfig.keyId ? razorpayConfig.keyId.trim() : '') || (import.meta.env.VITE_RAZORPAY_KEY_ID ? import.meta.env.VITE_RAZORPAY_KEY_ID.trim() : '');
    if (!razorKey) {
      alert('Razorpay Key ID is not configured. Please enter your Razorpay Key ID in Admin CMS ➔ Donate Page ➔ Payment Gateways.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Failed to load Razorpay Checkout SDK. Please check your network connection.');
        setIsProcessingPayment(false);
        return;
      }

      let orderId = '';
      try {
        const res = await fetch('/api/donations/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(amount),
            purpose: purposeName,
            donorInfo: formState
          })
        });
        const orderData = await res.json();
        if (!res.ok || !orderData.success) {
          alert(orderData.message || 'Failed to create Razorpay order. Please check gateway credentials in Admin CMS.');
          setIsProcessingPayment(false);
          return;
        }
        if (orderData.orderId && orderData.orderId.startsWith('order_')) {
          orderId = orderData.orderId;
        }
      } catch (e) {
        alert('Failed to connect to payment server. Please try again.');
        setIsProcessingPayment(false);
        return;
      }

      const options = {
        key: razorKey,
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        name: razorpayConfig.merchantName || 'Lakshya A Society for Social and Environmental Development',
        description: `Donation towards ${purposeName}`,
        image: '/lakshya.png',
        prefill: {
          name: formState.name,
          email: formState.email,
          contact: formState.phone
        },
        notes: {
          purpose: purposeName
        },
        theme: {
          color: razorpayConfig.themeColor || '#044e37',
          backdrop_color: 'rgba(0, 0, 0, 0.75)'
        },
        method: {
          upi: true,
          qr: true,
          card: true,
          netbanking: true,
          wallet: true
        },
        handler: async function (response) {
          try {
            const verifyRes = await fetch('/api/donations/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || '',
                razorpay_payment_id: response.razorpay_payment_id || '',
                razorpay_signature: response.razorpay_signature || '',
                name: formState.name,
                email: formState.email,
                phone: formState.phone,
                amount: Number(amount),
                purpose: purposeName,
                claim80g,
                panNumber: formState.panNumber?.trim().toUpperCase(),
                address: formState.address?.trim(),
                frequency
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              const allPresets = Array.isArray(donateData.presets) ? donateData.presets : [];
              const matched = allPresets.find(p => {
                const pTitle = (p.title || p.name || '').trim().toLowerCase();
                const reqTitle = (purposeName || '').trim().toLowerCase();
                return pTitle && reqTitle && pTitle === reqTitle;
              });

              const rawTarget = (matched && matched.redirectUrl && matched.redirectUrl.trim())
                ? matched.redirectUrl.trim()
                : (donateData.settings?.redirectUrl || '').trim();

              const redirectTarget = formatRedirectUrl(rawTarget);

              setSuccessDetails({
                name: formState.name,
                amount: Number(amount).toLocaleString('en-IN'),
                purpose: purposeName,
                redirectUrl: redirectTarget,
                id: verifyData.donation?.id || '',
                transactionRef: verifyData.donation?.transactionRef || response.razorpay_payment_id || '',
                receiptNumber: verifyData.donation?.receiptNumber || '',
                claim80g
              });
              setShowFailureModal(false);
              setShowSuccessModal(true);
              setFormState({ name: '', email: '', phone: '', panNumber: '', address: '' });
              setAmount('');
              setSelectedPurpose('');
            } else {
              setShowSuccessModal(false);
              setFailureReason(verifyData.message || 'Payment verification failed.');
              setShowFailureModal(true);
            }
          } catch (err) {
            console.error(err);
            setShowSuccessModal(false);
            setFailureReason('Network error verifying payment. Please try again.');
            setShowFailureModal(true);
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      if (orderId) {
        options.order_id = orderId;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setIsProcessingPayment(false);
        const reason = response.error?.description || response.error?.reason || 'Payment was declined by bank or cancelled.';
        setShowSuccessModal(false);
        setFailureReason(reason);
        setShowFailureModal(true);
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay Error:', err);
      alert('An error occurred while launching Razorpay. Please check your Razorpay Key ID.');
      setIsProcessingPayment(false);
    }
  };


  const pageTransition = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: 'easeOut' },
      };

  const cmsSettings = useCMSData('settings');
  const canonicalBase = cmsSettings?.seo?.canonicalUrl || 'https://lakshyafordevelopment.org';
  const canonicalUrl = `${canonicalBase}/donate`;

  return (
    <motion.div {...pageTransition} className="pt-20 relative bg-clay-gradient min-h-screen">
      <Helmet>
        <title>Support Our Cause | Donate | Lakshya Society</title>
        <meta name="description" content="Support children's primary education and environment preservation in India. Donate to Lakshya Society today. Contributions are 80G tax-deductible." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Support Our Cause | Donate | Lakshya Society" />
        <meta property="og:description" content="Support children's primary education and environment preservation in India. Donate to Lakshya Society today. Contributions are 80G tax-deductible." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Donate to Lakshya Society" />
        <meta name="twitter:description" content="Support education and environmental preservation. 80G tax-deductible donations." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
      </Helmet>

      <div className="relative z-10">
        <section
          className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center text-center bg-cover bg-center bg-charcoal"
          style={{
            backgroundImage: `linear-gradient(rgba(26,26,26,0.7), rgba(26,26,26,0.85)), url('${hero.bgImage || hero.image || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop"}')`,
          }}
        >
          <div className="relative z-10 max-w-4xl mx-auto px-6 space-y-6">
            <span className="inline-block text-xs font-semibold tracking-widest text-amber-400 uppercase font-sans border-l-2 border-amber-400 pl-3">
              Make A Difference
            </span>
            <h1 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl text-cream leading-tight drop-shadow-md">
              {hero.title || "Your support changes a life today."}
            </h1>
            <p className="text-cream/80 max-w-xl mx-auto font-sans font-light text-base md:text-lg leading-relaxed">
              {hero.subtitle || "100% of public donations directly fund child education kits, tree planting drives, and women vocational centers."}
            </p>
          </div>
        </section>

        {whyDonateList.length > 0 && (
          <section className="py-20 bg-cream/35">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {whyDonateList.map((item, idx) => (
                  <div
                    key={idx}
                    className="glass p-8 rounded-2xl flex flex-col items-start space-y-4 hover:shadow-xl transition-all duration-300 border border-white/20"
                  >
                    <div className="p-3 bg-forest-50 rounded-xl text-forest-700 border border-forest-100">
                      {iconMap[item.iconName] || <Leaf className="w-6 h-6 text-forest-600" />}
                    </div>
                    <h3 className="font-display font-bold text-xl text-charcoal">{item.title}</h3>
                    <p className="text-earth-600 text-sm md:text-base font-sans font-light leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="donation-form" className="py-20 bg-gradient-to-br from-earth-900 via-charcoal to-earth-900 border-t border-white/10 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">
            <div className="lg:col-span-7 glass p-8 md:p-12 rounded-3xl space-y-8 shadow-2xl relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-charcoal/10 pb-4">
                <h2 className="font-display font-bold text-2xl md:text-3xl text-charcoal">
                  Secure Donation Form
                </h2>
                
                {/* 📜 Section 80G Tax Exemption Callout Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 rounded-full text-xs font-semibold shrink-0 select-none">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>50% Tax Exemption under Sec 80G</span>
                </div>
              </div>

              {settings.enableForm !== false ? (
                <form onSubmit={handleDonateSubmit} className="space-y-6">

                  {/* Giving Frequency Selector */}
                  <div className="bg-charcoal/5 p-1.5 rounded-full flex gap-1 border border-charcoal/10">
                    <button
                      type="button"
                      onClick={() => setFrequency('one-time')}
                      className={`flex-1 py-2.5 px-4 rounded-full text-xs md:text-sm font-semibold transition-all ${
                        frequency === 'one-time'
                          ? 'bg-forest-600 text-white shadow-sm'
                          : 'text-charcoal/70 hover:text-charcoal'
                      }`}
                    >
                      Give Once
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequency('monthly')}
                      className={`flex-1 py-2.5 px-4 rounded-full text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        frequency === 'monthly'
                          ? 'bg-forest-600 text-white shadow-sm'
                          : 'text-charcoal/70 hover:text-charcoal'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Monthly Giving</span>
                    </button>
                  </div>

                  {/* Preset donation purpose/cause buttons */}
                  {presets.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <label className="text-sm font-semibold font-sans text-charcoal/80 block">
                        Select Donation Purpose / Cause
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {presets.map((preset) => {
                          const title = preset.title || preset.name || 'General Support';
                          const isSelected = selectedPurpose === title;

                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleSelectPreset(preset)}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-center space-y-1.5 ${
                                isSelected
                                  ? 'border-forest-500 bg-forest-500/10 text-forest-700 shadow-md font-bold scale-[1.01]'
                                  : preset.highlighted
                                  ? 'border-amber-400 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                                  : 'border-charcoal/15 bg-white/40 text-charcoal/80 hover:bg-white/60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{title}</span>
                                {preset.amount > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-500/15 text-forest-700 border border-forest-500/20">
                                    ₹{preset.amount}
                                  </span>
                                )}
                                {isSelected && <Check className="w-4 h-4 text-forest-600 ml-auto shrink-0" />}
                              </div>
                              {preset.label && (
                                <span className="text-[11px] leading-tight text-charcoal/60 font-light">
                                  {preset.label}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="donation_amount" className="text-sm font-semibold font-sans text-charcoal/80 block">
                        Donation Amount (INR)
                      </label>
                      {isFixedAmount && (
                        <span className="text-[10px] font-bold text-forest-700 bg-forest-500/10 px-2.5 py-0.5 rounded-full border border-forest-500/20">
                          Fixed Amount Set
                        </span>
                      )}
                    </div>
                    <div className="relative rounded-full shadow-sm max-w-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-charcoal/50 text-base font-sans">₹</span>
                      </div>
                      <input
                        type="text"
                        name="donation_amount"
                        id="donation_amount"
                        value={amount}
                        onChange={handleAmountChange}
                        readOnly={isFixedAmount}
                        className={`block w-full pl-8 pr-4 py-3.5 border rounded-full text-base font-sans transition-all text-charcoal ${
                          isFixedAmount
                            ? 'bg-charcoal/5 border-forest-500/30 text-charcoal/80 font-bold cursor-not-allowed select-none'
                            : 'bg-white/60 border-charcoal/15 placeholder-charcoal/40 focus:outline-none focus:border-forest-500 focus:bg-white'
                        }`}
                        placeholder={isFixedAmount ? `₹${amount} (Fixed)` : 'Enter amount to support'}
                        required
                        maxLength={10}
                      />
                    </div>
                    {isFixedAmount && (
                      <p className="text-[11px] text-charcoal/60 font-light font-sans italic pl-1">
                        Amount is fixed for "{selectedPurpose}". Tap cause again to deselect or choose another.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="md:col-span-2">
                      <FormField
                        label="Your Full Name"
                        id="floating_name"
                        name="name"
                        value={formState.name}
                        onChange={handleInputChange}
                        required
                        shouldReduceMotion={shouldReduceMotion}
                        maxLength={100}
                      />
                    </div>

                    {/* Email */}
                    <FormField
                      label="Your Email Address (Optional)"
                      id="floating_email"
                      name="email"
                      type="email"
                      value={formState.email}
                      onChange={handleInputChange}
                      shouldReduceMotion={shouldReduceMotion}
                      maxLength={254}
                    />

                    {/* Mobile Number */}
                    <FormField
                      label="Mobile Phone Number"
                      id="floating_phone"
                      name="phone"
                      type="tel"
                      value={formState.phone}
                      onChange={handleInputChange}
                      required
                      shouldReduceMotion={shouldReduceMotion}
                      maxLength={15}
                      pattern="[0-9+\-\s]{7,15}"
                    />

                    {/* 80G Tax Exemption Toggle */}
                    <div className="md:col-span-2 pt-2">
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="claim80g"
                            checked={claim80g}
                            onChange={(e) => setClaim80g(e.target.checked)}
                            className="w-5 h-5 rounded border-amber-400 text-forest-600 focus:ring-forest-500 cursor-pointer"
                          />
                          <span className="text-xs md:text-sm font-semibold text-charcoal font-sans">
                            Claim 50% Tax Exemption Certificate (Section 80G)
                          </span>
                        </label>
                        <p className="text-[11px] text-earth-700/80 font-sans font-light pl-8">
                          Indian Income Tax Department (Form 10BD) requires donor's PAN and postal address to issue valid 80G tax exemption certificates.
                        </p>

                        {claim80g && (
                          <motion.div
                            initial={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                            className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <FormField
                              label="PAN Number (Required for 80G)"
                              id="floating_pan"
                              name="panNumber"
                              value={formState.panNumber}
                              onChange={(e) => setFormState(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                              required={claim80g}
                              placeholder="e.g. ABCDE1234F"
                              maxLength={10}
                            />
                            <div className="md:col-span-2">
                              <FormField
                                label="Full Postal Address (Required for 80G)"
                                id="floating_address"
                                name="address"
                                value={formState.address}
                                onChange={handleInputChange}
                                required={claim80g}
                                placeholder="House/Flat No., Street, City, State, PIN"
                                maxLength={250}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <div className="pt-4">
                    <Button
                      variant="filled"
                      color="forest"
                      type="submit"
                      disabled={isProcessingPayment}
                      pulse={!isProcessingPayment}
                      className="w-full text-lg py-4 shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessingPayment ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Proceed to Support</span>
                      )}
                    </Button>
                  </div>

                </form>
              ) : (
                <div className="p-8 text-center text-charcoal/60 bg-white/30 border border-white/20 rounded-2xl">
                  <p className="font-sans font-medium text-lg">Online donations are temporarily closed. Please use bank details on the right.</p>
                </div>
              )}
            </div>

            {/* Right Column: Security & Tax Deduction Guarantee Cards */}
            <div className="lg:col-span-5 space-y-6 w-full">
              
              {/* Payment Methods Supported Box */}
              <div className="glass-dark p-8 rounded-3xl space-y-5 border border-white/10 shadow-2xl relative z-10 text-left font-sans">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-cream">100% Secure & Verified</h3>
                    <p className="text-white/60 text-xs font-light">Powered by SSL 256-bit Encrypted Gateways</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-white/80 font-light">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-forest-400 shrink-0" />
                    <span>Instant UPI Apps (Google Pay, PhonePe, Paytm, BHIM)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-forest-400 shrink-0" />
                    <span>All Credit & Debit Cards (Visa, Mastercard, RuPay)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-forest-400 shrink-0" />
                    <span>NetBanking (SBI, HDFC, ICICI, Axis & 50+ Banks)</span>
                  </div>
                </div>
              </div>

              {/* Tax Note Card */}
              <div className="glass-dark border-l-4 border-l-amber-500 p-6 rounded-3xl flex items-start space-x-4 shadow-xl">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-left font-sans">
                  <h4 className="font-bold text-sm text-cream">80G Tax Deduction Eligibility</h4>
                  <p className="text-xs text-white/70 leading-relaxed font-light">
                    {settings.taxNote || "Contributions are eligible for 50% tax deduction under Section 80G of the Income Tax Act, 1961."}
                  </p>
                </div>
              </div>

              {/* Direct UPI VPA Card */}
              {donateData?.upi?.upiId && (
                <div className="glass-dark p-6 rounded-3xl space-y-4 border border-white/10 shadow-xl font-sans text-left">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                    <div className="w-9 h-9 rounded-xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-400">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-cream">Direct UPI VPA Transfer</h4>
                      <p className="text-white/60 text-[11px] font-light">Pay directly using GPay / PhonePe / Paytm</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <span className="text-[10px] text-white/50 block font-mono uppercase tracking-wider">UPI VPA ID</span>
                      <span className="text-sm font-mono font-bold text-emerald-400 select-all">{donateData.upi.upiId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(donateData.upi.upiId);
                        setCopiedUpi(true);
                        setTimeout(() => setCopiedUpi(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {donateData.upi.displayName && (
                    <div className="text-[11px] text-white/60 pl-1 font-light">
                      Beneficiary: <span className="text-white/80 font-medium">{donateData.upi.displayName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Direct Bank Account Transfer Card */}
              {donateData?.bankTransfer?.accountNumber && (
                <div className="glass-dark p-6 rounded-3xl space-y-4 border border-white/10 shadow-xl font-sans text-left">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                    <div className="w-9 h-9 rounded-xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-400">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-cream">Direct Bank Account Transfer</h4>
                      <p className="text-white/60 text-[11px] font-light">NEFT / RTGS / IMPS Bank Transfer</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-white/80">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <span className="text-[10px] text-white/50 block font-mono uppercase tracking-wider">Account Number</span>
                        <span className="text-sm font-mono font-bold text-white select-all">{donateData.bankTransfer.accountNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(donateData.bankTransfer.accountNumber);
                          setCopiedAccount(true);
                          setTimeout(() => setCopiedAccount(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <span className="text-[10px] text-white/50 block font-mono uppercase tracking-wider">IFSC Code</span>
                        <span className="text-sm font-mono font-bold text-white select-all">{donateData.bankTransfer.ifscCode}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(donateData.bankTransfer.ifscCode);
                          setCopiedIfsc(true);
                          setTimeout(() => setCopiedIfsc(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedIfsc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIfsc ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {donateData.bankTransfer.accountName && (
                      <div className="text-[11px] text-white/70 pt-1">
                        Account Holder: <span className="text-white font-medium">{donateData.bankTransfer.accountName}</span>
                      </div>
                    )}
                    {donateData.bankTransfer.bankName && (
                      <div className="text-[11px] text-white/70">
                        Bank Name: <span className="text-white font-medium">{donateData.bankTransfer.bankName}</span> {donateData.bankTransfer.branch ? `(${donateData.bankTransfer.branch})` : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>
        </section>
      </div>

      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.5 }}
              className="bg-cream border border-forest-500/20 max-w-md w-full rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6 overflow-hidden"
            >
              {/* Decorative liquid background element inside modal */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-forest-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-charcoal/5 text-charcoal/60 hover:text-charcoal transition-colors focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon / Celebration */}
              <div className="mx-auto w-16 h-16 bg-forest-500/10 rounded-full flex items-center justify-center text-forest-600 relative">
                <Heart className="w-8 h-8 fill-forest-600 animate-pulse" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2, duration: 0.4 }}
                  className="absolute -top-1 -right-1 p-1 bg-amber-400 rounded-full text-charcoal shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                </motion.div>
              </div>

              {/* Thank you message */}
              <div className="space-y-2">
                <h3 className="font-display font-bold text-2xl md:text-3xl text-charcoal">
                  Thank You, {successDetails.name}!
                </h3>
                <p className="text-earth-600 font-sans font-light text-sm md:text-base leading-relaxed">
                  Your contribution of <strong className="text-forest-700 font-bold">₹{successDetails.amount}</strong> towards <strong className="text-forest-700 font-bold">{successDetails.purpose}</strong> has been successfully verified & registered. An 80G tax receipt will be dispatched to your email!
                </p>
              </div>

              {/* Where it goes */}
              <div className="bg-forest-500/5 border border-forest-500/10 rounded-2xl p-4 text-left space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-forest-700 font-sans">
                  How your gift helps
                </div>
                <p className="text-xs text-earth-700/90 font-sans font-light leading-relaxed">
                  Your contribution directly funds clean environmental projects, primary education support under the Adhaar initiative, and health/nutritional kits under Vaidehi.
                </p>
              </div>

              {/* Action buttons / Redirect Link */}
              <div className="pt-2 space-y-2.5">
                {successDetails.id && (
                  <a
                    href={`/api/donations/${successDetails.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-6 rounded-full font-bold bg-forest-600 hover:bg-forest-700 text-white flex items-center justify-center gap-2 shadow-lg transition-all text-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official 80G Receipt (PDF)</span>
                  </a>
                )}
                {successDetails.redirectUrl ? (
                  <>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-xs font-semibold text-amber-800 font-sans">
                      {redirectCountdown > 0 ? (
                        <span>Redirecting to your link in <strong className="text-amber-900 font-bold text-sm">{redirectCountdown}s</strong>...</span>
                      ) : (
                        <span>Redirecting now...</span>
                      )}
                    </div>
                    {successDetails.redirectUrl.includes('whatsapp') || successDetails.redirectUrl.includes('wa.me') ? (
                      <a
                        href={successDetails.redirectUrl}
                        className="w-full py-3.5 px-6 rounded-full font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-2 shadow-lg transition-all text-sm cursor-pointer"
                      >
                        <MessageCircle className="w-5 h-5 fill-current" />
                        <span>Join WhatsApp Group Now ➔</span>
                      </a>
                    ) : (
                      <a
                        href={successDetails.redirectUrl}
                        className="w-full py-3.5 px-6 rounded-full font-bold bg-forest-600 hover:bg-forest-700 text-white flex items-center justify-center gap-2 shadow-lg transition-all text-sm cursor-pointer"
                      >
                        <span>Access Link Now ➔</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSuccessModal(false)}
                      className="w-full py-1.5 text-xs text-earth-600 hover:text-earth-800 transition-colors font-medium"
                    >
                      Close Window
                    </button>
                  </>
                ) : (
                  <Button
                    variant="filled"
                    color="forest"
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-shadow"
                  >
                    Close
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Incomplete / Failed Modal */}
      <AnimatePresence>
        {showFailureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFailureModal(false)}
              className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-cream border border-red-500/20 max-w-md w-full rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 text-left space-y-5 overflow-hidden font-sans"
            >
              <button
                onClick={() => setShowFailureModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-charcoal/5 text-charcoal/60 hover:text-charcoal transition-colors focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 relative">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="font-display font-bold text-2xl text-charcoal">
                  Payment Incomplete
                </h3>
                <p className="text-earth-600 font-sans text-sm leading-relaxed">
                  Your payment could not be completed. No charges were made to your account.
                </p>
              </div>

              {failureReason && (
                <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-4 text-xs font-sans space-y-1">
                  <div className="font-semibold text-red-700 uppercase tracking-wider">
                    Reason / Status
                  </div>
                  <p className="text-red-900 font-medium leading-relaxed">
                    {failureReason}
                  </p>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <Button
                  variant="filled"
                  color="forest"
                  onClick={() => setShowFailureModal(false)}
                  className="w-full py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default Donate;
