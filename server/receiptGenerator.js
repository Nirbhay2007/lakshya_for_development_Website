const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Helper to convert number to Indian words
function numberToIndianWords(num) {
  const n = Math.floor(Number(num));
  if (isNaN(n) || n === 0) return 'Zero Rupees Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowHundred(val) {
    if (val < 20) return single[val];
    return tens[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + single[val % 10] : '');
  }

  function convertBelowThousand(val) {
    if (val < 100) return convertBelowHundred(val);
    return single[Math.floor(val / 100)] + ' Hundred' + (val % 100 !== 0 ? ' ' + convertBelowHundred(val % 100) : '');
  }

  let words = '';
  let crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;

  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) words += convertBelowThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertBelowThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertBelowThousand(thousand) + ' Thousand ';
  if (remainder > 0) words += convertBelowThousand(remainder);

  return 'Rupees ' + words.trim() + ' Only';
}

function generate80GReceiptPDF(donation, orgSettings = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Donation Receipt - ${donation.receiptNumber || donation.id}`,
          Author: 'Lakshya Society for Social & Environmental Development',
          Subject: '80G Tax Exemption Donation Receipt',
          Keywords: '80G, Donation, NGO, Tax Exemption, Lakshya'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const orgName = orgSettings.siteName || 'LAKSHYA SOCIETY FOR SOCIAL & ENVIRONMENTAL DEVELOPMENT';
      const orgAddress = orgSettings.address || 'Civil Lines, Moradabad, Uttar Pradesh, India - 244001';
      const regNo = orgSettings.regNo || 'Societies Registration Act XXI of 1860, No. 1284/2006-2007';
      const urn80g = orgSettings.urn80g || 'AAATL8080GF20214';
      const panNgo = orgSettings.ngoPan || 'AAATL8080G';

      // Outer Decorative Border
      doc.rect(25, 25, 545, 792).lineWidth(1.5).stroke('#2e7d32');
      doc.rect(29, 29, 537, 784).lineWidth(0.5).stroke('#a5d6a7');

      // Top Banner Header
      doc.rect(30, 30, 535, 80).fill('#1b5e20');

      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(16)
         .text(orgName, 35, 45, { align: 'center', width: 525 });

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#e8f5e9')
         .text(`Reg. Under: ${regNo} | PAN: ${panNgo}`, 35, 67, { align: 'center', width: 525 })
         .text(`80G Registration (URN): ${urn80g} | ${orgAddress}`, 35, 81, { align: 'center', width: 525 });

      // Title Box
      doc.moveDown(2);
      doc.rect(40, 120, 515, 34).fill('#f1f8e9');
      doc.rect(40, 120, 515, 34).lineWidth(0.8).stroke('#81c784');

      doc.fillColor('#1b5e20')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('DONATION RECEIPT & SECTION 80G TAX CERTIFICATE', 45, 126, { align: 'center', width: 505 });
      doc.font('Helvetica-Oblique')
         .fontSize(8)
         .fillColor('#33691e')
         .text('(Issued under Rule 18AB of Income Tax Rules, 1962 / Form 10BE Format)', 45, 140, { align: 'center', width: 505 });

      // Receipt Meta Info Table
      const dateStr = donation.date ? new Date(donation.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
      const year = new Date(donation.date || Date.now()).getFullYear();
      const finYear = `${year}-${String(year + 1).slice(-2)}`;

      const startY = 168;
      doc.rect(40, startY, 515, 48).fill('#fafafa');
      doc.rect(40, startY, 515, 48).lineWidth(0.5).stroke('#cfd8dc');

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#263238');
      doc.text('Receipt No:', 50, startY + 8);
      doc.font('Helvetica').fillColor('#000000').text(donation.receiptNumber || `LAKSHYA/80G/${finYear}/${donation.id.slice(-4)}`, 120, startY + 8);

      doc.font('Helvetica-Bold').fillColor('#263238').text('Receipt Date:', 340, startY + 8);
      doc.font('Helvetica').fillColor('#000000').text(dateStr, 420, startY + 8);

      doc.font('Helvetica-Bold').fillColor('#263238').text('Financial Year:', 50, startY + 28);
      doc.font('Helvetica').fillColor('#000000').text(`FY ${finYear}`, 120, startY + 28);

      doc.font('Helvetica-Bold').fillColor('#263238').text('Payment Mode:', 340, startY + 28);
      doc.font('Helvetica').fillColor('#000000').text(donation.paymentMethod || 'Online (Razorpay)', 420, startY + 28);

      // Donor Details Section
      const donorY = 228;
      doc.rect(40, donorY, 515, 20).fill('#e8f5e9');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1b5e20').text('DONOR DETAILS', 50, donorY + 5);

      doc.rect(40, donorY + 20, 515, 96).lineWidth(0.5).stroke('#cfd8dc');

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Donor Name:', 50, donorY + 30);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(donation.name || 'Anonymous Donor', 140, donorY + 30);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Donor PAN:', 340, donorY + 30);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1b5e20').text(donation.panNumber || (donation.claim80g ? 'Not Specified' : 'N/A (Non-80G)'), 420, donorY + 30);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Email Address:', 50, donorY + 52);
      doc.font('Helvetica').fontSize(9).fillColor('#000000').text(donation.email || 'N/A', 140, donorY + 52);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Phone Number:', 340, donorY + 52);
      doc.font('Helvetica').fontSize(9).fillColor('#000000').text(donation.phone || 'N/A', 420, donorY + 52);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Postal Address:', 50, donorY + 74);
      doc.font('Helvetica').fontSize(9).fillColor('#000000').text(donation.address || 'Address provided via online checkout', 140, donorY + 74, { width: 400 });

      // Contribution Details Section
      const contribY = 356;
      doc.rect(40, contribY, 515, 20).fill('#e8f5e9');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1b5e20').text('CONTRIBUTION PARTICULARS', 50, contribY + 5);

      doc.rect(40, contribY + 20, 515, 120).lineWidth(0.5).stroke('#cfd8dc');

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Donation Purpose:', 50, contribY + 32);
      doc.font('Helvetica').fontSize(9).fillColor('#000000').text(donation.purpose || 'General NGO Support', 170, contribY + 32);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Contribution Type:', 340, contribY + 32);
      doc.font('Helvetica').fontSize(9).fillColor('#000000').text(donation.frequency === 'monthly' ? 'Monthly Sponsorship' : 'One-Time Donation', 430, contribY + 32);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Transaction Ref / ID:', 50, contribY + 54);
      doc.font('Courier').fontSize(9).fillColor('#1565c0').text(donation.transactionRef || donation.id, 170, contribY + 54);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#37474f').text('Payment Status:', 340, contribY + 54);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#2e7d32').text('VERIFIED & SETTLED', 430, contribY + 54);

      doc.rect(45, contribY + 74, 505, 1).fill('#e0e0e0');

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1b5e20').text('Donation Amount:', 50, contribY + 86);
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1b5e20').text(`INR ₹${Number(donation.amount).toLocaleString('en-IN')}/-`, 170, contribY + 84);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#546e7a').text('Amount in Words:', 50, contribY + 110);
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#263238').text(numberToIndianWords(donation.amount), 140, contribY + 110, { width: 400 });

      // Statutory 80G Declaration
      const clauseY = 508;
      doc.rect(40, clauseY, 515, 60).fill('#fffde7');
      doc.rect(40, clauseY, 515, 60).lineWidth(0.5).stroke('#fff59d');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#f57f17').text('STATUTORY 80G TAX EXEMPTION DECLARATION', 50, clauseY + 7);
      doc.font('Helvetica').fontSize(7.8).fillColor('#37474f')
         .text(`Donations to Lakshya Society for Social & Environmental Development are eligible for 50% deduction from taxable income under Section 80G(5)(vi) of the Income Tax Act, 1961 vide Order / Unique Registration Number ${urn80g}.`, 50, clauseY + 22, { width: 495, lineGap: 2 })
         .text('This digital certificate serves as official proof of donation for filing Annual Income Tax Returns in India.', 50, clauseY + 44, { width: 495 });

      // Signatures and Verification
      const signY = 600;
      doc.rect(40, signY, 240, 110).lineWidth(0.5).stroke('#cfd8dc');
      doc.rect(315, signY, 240, 110).lineWidth(0.5).stroke('#cfd8dc');

      // Left: Verification QR Box / Security Hash
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#455a64').text('OFFICIAL VERIFICATION CODE', 50, signY + 10);
      doc.font('Courier').fontSize(7.5).fillColor('#607d8b')
         .text(`HASH: ${Buffer.from(donation.id + '-' + donation.amount).toString('base64')}`, 50, signY + 26)
         .text(`VERIFY: https://lakshyafordevelopment.org/api/donations/${donation.id}/verify`, 50, signY + 38, { width: 220 })
         .text('Status: Digitally Signed & Authenticated', 50, signY + 60);

      doc.font('Helvetica-Oblique').fontSize(7).fillColor('#78909c')
         .text('This is a computer generated receipt. No physical signature is required under IT rules.', 50, signY + 84, { width: 220 });

      // Right: Authorized Signatory
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#455a64').text('FOR LAKSHYA SOCIETY', 325, signY + 10);
      doc.rect(370, signY + 30, 130, 36).fill('#f1f8e9');
      doc.rect(370, signY + 30, 130, 36).lineWidth(0.5).stroke('#81c784');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#2e7d32')
         .text('DIGITALLY SIGNED', 370, signY + 38, { align: 'center', width: 130 });
      doc.font('Helvetica').fontSize(6.5).fillColor('#388e3c')
         .text('Lakshya Society India', 370, signY + 52, { align: 'center', width: 130 });

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#263238').text('Authorized Signatory / Secretary', 325, signY + 76, { align: 'center', width: 220 });
      doc.font('Helvetica').fontSize(7.5).fillColor('#78909c').text('Finance & Statutory Compliance Desk', 325, signY + 90, { align: 'center', width: 220 });

      // Footer Note
      doc.font('Helvetica').fontSize(7).fillColor('#90a4ae')
         .text('Thank you for partnering with Lakshya Society to empower underprivileged children and preserve our natural environment.', 40, 770, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generate80GReceiptPDF,
  numberToIndianWords
};
