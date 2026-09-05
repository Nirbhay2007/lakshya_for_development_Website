# Lakshya Website and CMS Audit

## Executive summary

The public website and the CMS publish workflow were verified. A Hero headline change saved as a draft, published successfully, appeared on the live homepage, and was restored to its original wording. The most important risks are CMS authentication, credential handling, and runtime data storage.

## Confirmed vulnerabilities

### Critical — Default administrator credentials in source

The server contains default credential hashes and can recreate them when its authentication file is missing.

**Recommendation:** remove defaults; require environment-managed secrets or a secure first-run setup; refuse to start without credentials.

### Critical — Reusable password hashes as API credentials

The browser receives a password-derived hash and sends it in CMS request headers. That hash operates as a reusable credential.

**Recommendation:** use short-lived server sessions or signed tokens in secure, HTTP-only, SameSite cookies. Never expose a password verifier to the browser.

### High — Six-digit PIN-only administration

Rate limits and lockouts help, but six-digit credentials are not sufficient for a production CMS.

**Recommendation:** use a strong password or passkey plus MFA, lockout alerts, and audit notifications.

### High — Permissive CORS

The server enables CORS without a production origin allowlist.

**Recommendation:** allow only the production website and approved local development origins.

### High — Runtime file storage

CMS data, credentials, logs, and backups are file-based at runtime, creating durability and deployment risks.

**Recommendation:** move to a database or managed durable storage with validation, migrations, and transactional backups.

### Medium — Custom script capability

CMS custom-script fields can create stored-XSS risk.

**Recommendation:** remove arbitrary scripts where possible, otherwise use strict allowlists, review workflow, and a Content Security Policy.

### Medium — Public content API

Published content is publicly readable. That is acceptable only if drafts, internal metadata, payment secrets, logs, and personal data are always excluded.

**Recommendation:** serve a dedicated public-data projection and add automated privacy tests.

## Verified CMS workflow

1. CMS login opened the dashboard.
2. An existing Hero slide expanded into its editor.
3. A headline change saved as an unpublished draft.
4. Publishing required a confirmation step.
5. The public homepage reflected the published change immediately.
6. The original headline was restored and republished.

## Fast review of remaining flows

These flows were reviewed from their implementation without live side effects such as sending email, charging a payment method, uploading files, changing backups, or creating submissions.

### Payment

The Razorpay flow checks signatures, payment status, amount, and duplicate transaction IDs. Keep payment secrets out of CMS-editable data and add staging tests for failed, delayed, duplicate, and webhook-delivered payments.

### Uploads

Uploads enforce file-size and file-type limits. Add server-side content inspection, randomized stored filenames, malware scanning where appropriate, and prevent uploaded files from executing as application code.

### Backups

Backup creation, restore, and deletion require admin authentication and the security key. Restore and deletion reject path-traversal values. Add scheduled restore drills and encrypt backups at rest.

### Email, newsletter, and public forms

Authentication and public forms have rate limits. Add bot protection, email verification, field-validation tests, delivery monitoring, and keep SMTP credentials outside CMS configuration.

## Major improvements

- Add server-managed authentication, MFA, role-based access, and short session expiry.
- Move payment, SMTP, and third-party secrets to environment variables or a secret manager.
- Add revision history, rollback, and a preview-before-publish workflow.
- Add strict server-side schemas for each CMS section and upload.
- Add Helmet, CSP, Permissions Policy, monitoring, and security tests.

## Minor improvements

- Replace zero-valued impact metrics and placeholder partner logos.
- Fix the incomplete contact-footer text.
- Confirm social links and contact destinations are production values.
- Improve CMS saved, draft, published, and preview status messages.
- Add responsive image optimization, accessibility checks, and SEO validation.

## Recommended order

1. Replace default credentials and reusable hash-header authentication.
2. Restrict CORS, secrets, and public data exposure.
3. Move runtime data to durable managed storage.
4. Add CSP, validation, monitoring, and integration tests.
5. Complete content, accessibility, SEO, and performance polish.
