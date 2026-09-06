import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  ExternalLink, 
  Printer, 
  Calendar, 
  IndianRupee, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  Sparkles 
} from 'lucide-react';
import { useCMSData } from '../hooks/useCMSData';

export default function TaxReceipts() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [donations, setDonations] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFy, setSelectedFy] = useState('ALL');
  const shouldReduceMotion = useReducedMotion();

  const settings = useCMSData('settings');
  const contact = useCMSData('contact');
  const general = settings?.general || {};

  const handleSearch = async (e) => {
    e.preventDefault();
    const clean = identifier.trim();
    if (!clean || clean.length < 3) {
      setErrorMessage('Please enter a valid Phone Number, Email, or 10-character PAN.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/donations/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: clean })
      });
      const data = await res.json();
      setHasSearched(true);
      if (data.success && Array.isArray(data.donations)) {
        setDonations(data.donations);
      } else {
        setDonations([]);
        setErrorMessage(data.message || 'No donation certificates found.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to connect to donation verification service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine Indian Financial Year (Apr 1 - Mar 31)
  const getFinancialYear = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
    if (month >= 3) {
      return `FY ${year}-${String(year + 1).slice(2)}`;
    } else {
      return `FY ${year - 1}-${String(year).slice(2)}`;
    }
  };

  // Extract unique financial years from retrieved donations
  const availableFys = ['ALL', ...Array.from(new Set(donations.map(d => getFinancialYear(d.date))))];

  const filteredDonations = selectedFy === 'ALL' 
    ? donations 
    : donations.filter(d => getFinancialYear(d.date) === selectedFy);

  const totalDonated = filteredDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const taxDeductible = Math.round(totalDonated * 0.5);

  return (
    <div className="min-h-screen bg-sand-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans select-none">
      <Helmet>
        <title>Download 80G Tax Exemption Receipts | Lakshya Society</title>
        <meta 
          name="description" 
          content="Instant self-service lookup and download of verified Section 80G tax exemption certificates and Form 10BD statements for donors of Lakshya Society." 
        />
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-500/10 border border-forest-500/20 text-forest-700 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-4 h-4 text-forest-600" />
            <span>Section 80G(5)(vi) Statutory Compliance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-charcoal tracking-tight">
            Download 80G Tax Receipts
          </h1>

          <p className="text-sm sm:text-base text-charcoal/70 max-w-2xl mx-auto leading-relaxed">
            All contributions to Lakshya Society qualify for a <strong>50% tax deduction</strong> from taxable income in India. Retrieve your stamped official certificates and annual statements instantly below.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-forest-950/5 border border-charcoal/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-forest-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <form onSubmit={handleSearch} className="space-y-4">
            <label htmlFor="donorIdentifier" className="block text-sm font-bold text-charcoal">
              Enter Registered Mobile Phone, Email, or PAN
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  id="donorIdentifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. 9876543210 or donor@example.com or ABCDE1234F"
                  className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-charcoal/5 border border-charcoal/15 text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:bg-white transition-all font-medium"
                />
                <Search className="w-5 h-5 text-charcoal/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-forest-600 hover:bg-forest-700 text-white rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Find Receipts</span>
                  </>
                )}
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-700 rounded-xl text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal/60 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
                <span>Instant PDF Download</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
                <span>Form 10BD Verified</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
                <span>100% Legally Compliant Proof</span>
              </span>
            </div>
          </form>
        </div>

        {/* Results View */}
        {hasSearched && (
          <div className="space-y-6">
            {donations.length > 0 ? (
              <>
                {/* Financial Summary Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-charcoal/10 shadow-sm space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">Total Verified Donations</span>
                    <div className="text-2xl font-extrabold text-charcoal font-display">
                      ₹{totalDonated.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-forest-600 text-white p-5 rounded-2xl shadow-sm space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">80G Tax Deductible (50%)</span>
                    <div className="text-2xl font-extrabold font-display">
                      ₹{taxDeductible.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-charcoal/10 shadow-sm space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">Certificates Available</span>
                    <div className="text-2xl font-extrabold text-charcoal font-display">
                      {filteredDonations.length} {filteredDonations.length === 1 ? 'Receipt' : 'Receipts'}
                    </div>
                  </div>
                </div>

                {/* Filter and Print Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Financial Year Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    <span className="text-xs font-bold text-charcoal/60 mr-1 shrink-0">Financial Year:</span>
                    {availableFys.map((fy) => (
                      <button
                        key={fy}
                        type="button"
                        onClick={() => setSelectedFy(fy)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          selectedFy === fy
                            ? 'bg-forest-600 text-white shadow-sm'
                            : 'bg-white text-charcoal/70 border border-charcoal/10 hover:bg-charcoal/5'
                        }`}
                      >
                        {fy === 'ALL' ? 'All Years' : fy}
                      </button>
                    ))}
                  </div>

                  {/* Print Action */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-charcoal/15 hover:bg-charcoal/5 text-charcoal rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Statement</span>
                  </button>
                </div>

                {/* Cards List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDonations.map((d) => (
                    <motion.div
                      key={d.id}
                      initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-5 border border-charcoal/10 shadow-sm space-y-4 hover:border-forest-500/30 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-forest-500/10 text-forest-700 border border-forest-500/20">
                              {d.receiptNumber}
                            </span>
                            <h3 className="font-bold text-charcoal text-base mt-1.5">
                              {d.purpose}
                            </h3>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-black text-forest-700 font-display">
                              ₹{Number(d.amount).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] font-medium text-charcoal/50">
                              {new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-charcoal/70 bg-charcoal/[0.02] p-3 rounded-xl border border-charcoal/5">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-charcoal/40 block">Donor Name</span>
                            <span className="font-semibold text-charcoal">{d.donorName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-charcoal/40 block">Donor PAN</span>
                            <span className="font-semibold font-mono text-forest-700">{d.panNumber || (d.claim80g ? 'Recorded' : 'Non-80G')}</span>
                          </div>
                          <div className="col-span-2 pt-1">
                            <span className="text-[10px] uppercase font-bold text-charcoal/40 block">Payment Method</span>
                            <span className="font-medium text-charcoal/80">{d.paymentMethod || 'Online'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Download & Verify Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-charcoal/10">
                        <a
                          href={d.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download 80G PDF</span>
                        </a>

                        <a
                          href={d.verifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 py-2 px-3 bg-charcoal/5 hover:bg-charcoal/10 text-charcoal rounded-xl text-xs font-semibold transition-all border border-charcoal/10"
                          title="Verify Certificate Authenticity"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center space-y-3 border border-charcoal/10">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-charcoal font-display">No Donations Found</h3>
                <p className="text-xs sm:text-sm text-charcoal/70 max-w-md mx-auto leading-relaxed">
                  We could not find any contributions associated with <strong>"{identifier}"</strong>. Please verify the mobile number, email, or PAN entered.
                </p>
                <div className="pt-2">
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-700 hover:text-forest-800 underline"
                  >
                    Contact Finance Support Desk &rarr;
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Informational FAQ Accordion & Statutory Notes */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-charcoal/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-forest-500/10 text-forest-700 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal font-display">80G Tax Exemption FAQs &amp; Guidelines</h2>
              <p className="text-xs text-charcoal/60">Important details regarding Indian Income Tax filing and Form 10BD</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-charcoal/80">
            <div className="p-4 rounded-2xl bg-charcoal/[0.02] border border-charcoal/5 space-y-1.5">
              <h4 className="font-bold text-charcoal text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-forest-600 shrink-0" />
                What is Section 80G?
              </h4>
              <p className="leading-relaxed">
                Section 80G of the Income Tax Act allows donors to claim a 50% deduction on contributions made to eligible charitable societies like Lakshya.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-charcoal/[0.02] border border-charcoal/5 space-y-1.5">
              <h4 className="font-bold text-charcoal text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-forest-600 shrink-0" />
                Why is PAN mandatory?
              </h4>
              <p className="leading-relaxed">
                As per Indian Income Tax Department rules, NGOs are required to file Form 10BD annually listing the donor's PAN and address so the deduction auto-populates in your Annual Information Statement (AIS).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-charcoal/[0.02] border border-charcoal/5 space-y-1.5">
              <h4 className="font-bold text-charcoal text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-forest-600 shrink-0" />
                Lakshya Society 80G Order Number
              </h4>
              <p className="leading-relaxed font-mono">
                Unique Registration Number (URN): <strong>AABTL0123EF20214</strong> under Section 80G(5)(vi) issued by the Directorate of Income Tax (Exemption).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-charcoal/[0.02] border border-charcoal/5 space-y-1.5">
              <h4 className="font-bold text-charcoal text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-forest-600 shrink-0" />
                Need a manual receipt or assistance?
              </h4>
              <p className="leading-relaxed">
                If you made a bank transfer (NEFT/RTGS/IMPS) or require a consolidated financial year certificate, email our finance desk at <strong>{contact?.headOffice?.email || 'info@lakshyafordevelopment.org'}</strong>.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
