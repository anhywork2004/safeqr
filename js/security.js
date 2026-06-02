// ============================================================
// SafeQR – Frontend Security Module
// ============================================================
// Provides: XSS sanitization, token management with expiry
// check, input validation, secure random token generation,
// CSP violation reporting, and safe DOM manipulation.
// ============================================================

(function () {
  'use strict';

  // ─── XSS Sanitization ─────────────────────────────────────

  /**
   * Escape HTML to prevent XSS.
   * Use this before inserting user-generated content into the DOM.
   */
  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Strip all HTML tags from a string.
   */
  function stripHTML(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
  }

  /**
   * Sanitize a URL for safe use in href/src attributes.
   * Only allows http:, https:, tel:, mailto:, and relative URLs.
   */
  function sanitizeURL(url) {
    if (typeof url !== 'string') return '#';
    var trimmed = url.trim();
    // Allow relative URLs
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return escapeAttribute(trimmed);
    }
    // Allow safe protocols
    if (/^(https?:|tel:|mailto:|geo:)/i.test(trimmed)) {
      return escapeAttribute(trimmed);
    }
    return '#';
  }

  /**
   * Escape a value for safe use inside an HTML attribute.
   */
  function escapeAttribute(value) {
    if (typeof value !== 'string') return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── Token Management ─────────────────────────────────────

  var TOKEN_KEY = 'safeqr_token';

  /**
   * Store JWT token securely.
   * Note: localStorage is vulnerable to XSS. For production,
   * consider httpOnly cookies set by the server.
   */
  function storeToken(token) {
    try {
      if (!token || typeof token !== 'string') return false;
      // Basic JWT format validation
      var parts = token.split('.');
      if (parts.length !== 3) return false;
      if (token.length > 2048) return false; // Suspiciously large
      localStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch (e) {
      console.warn('[Security] Failed to store token:', e.message);
      return false;
    }
  }

  /**
   * Retrieve stored JWT token.
   * Returns null if missing, expired, or invalid.
   */
  function getToken() {
    try {
      var token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      if (isTokenExpired(token)) {
        clearToken();
        return null;
      }
      return token;
    } catch (e) {
      return null;
    }
  }

  /**
   * Remove stored JWT token.
   */
  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  /**
   * Check if a JWT token is expired.
   * Returns true if expired or invalid format.
   */
  function isTokenExpired(token) {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return true;

      // Decode payload (middle part)
      var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      var now = Math.floor(Date.now() / 1000);

      // Check expiry with 30-second clock skew tolerance
      if (payload.exp && payload.exp < (now - 30)) return true;

      // Check not-before with 30-second tolerance
      if (payload.nbf && payload.nbf > (now + 30)) return true;

      return false;
    } catch (e) {
      return true;
    }
  }

  /**
   * Parse token payload without validation.
   * Returns null if format is invalid.
   */
  function parseTokenPayload(token) {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) {
      return null;
    }
  }

  // ─── Input Validation ─────────────────────────────────────

  /**
   * Validate phone number format.
   */
  function isValidPhone(phone) {
    if (typeof phone !== 'string') return false;
    return /^[\d\s.()-]{3,20}$/.test(phone.trim());
  }

  /**
   * Validate agency ID format.
   */
  function isValidAgencyId(id) {
    if (typeof id !== 'string') return false;
    return /^[a-z][a-z0-9_-]{0,31}$/.test(id);
  }

  /**
   * Sanitize chat message input.
   */
  function sanitizeChatMessage(msg) {
    if (typeof msg !== 'string') return '';
    // Strip HTML, trim, limit length
    var cleaned = stripHTML(msg).trim();
    return cleaned.substring(0, 500);
  }

  // ─── Secure Random ────────────────────────────────────────

  /**
   * Generate a cryptographically secure random token.
   */
  function generateRandomToken(length) {
    length = length || 32;
    var arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr, function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  // ─── CSP Violation Reporting ──────────────────────────────

  /**
   * Report CSP violations to the server.
   */
  function reportCSPViolation(violation) {
    var report = {
      'csp-report': {
        'document-uri': violation.documentURI || document.URL,
        'violated-directive': violation.violatedDirective || '',
        'blocked-uri': violation.blockedURI || '',
        'original-policy': violation.originalPolicy || '',
      },
    };

    // Send report via sendBeacon (fire-and-forget)
    try {
      var blob = new Blob([JSON.stringify(report)], { type: 'application/csp-report' });
      navigator.sendBeacon('/api/csp-report', blob);
    } catch (e) {
      console.warn('[Security] CSP violation:', report['csp-report']);
    }
  }

  // Listen for CSP violation reports
  if (typeof document !== 'undefined') {
    document.addEventListener('securitypolicyviolation', function (e) {
      console.warn(
        '[Security] CSP Violation:',
        'directive=' + e.violatedDirective,
        'blocked=' + e.blockedURI,
        'document=' + e.documentURI
      );
    });
  }

  // ─── Session Validation ───────────────────────────────────

  var SESSION_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

  /**
   * Check if the current admin session is valid.
   */
  function isSessionValid() {
    try {
      var session = JSON.parse(sessionStorage.getItem('safeqr_session'));
      if (!session) return false;
      if (!session.loginTime) return false;
      var elapsed = Date.now() - session.loginTime;
      return elapsed < SESSION_MAX_AGE;
    } catch (e) {
      return false;
    }
  }

  /**
   * Create a new admin session.
   */
  function createSession(agencyId, agencyName) {
    var session = {
      agencyId: agencyId,
      agencyName: agencyName,
      loginTime: Date.now(),
      sessionId: generateRandomToken(16),
    };
    sessionStorage.setItem('safeqr_session', JSON.stringify(session));
    return session;
  }

  /**
   * Destroy admin session.
   */
  function destroySession() {
    sessionStorage.removeItem('safeqr_session');
    clearToken();
  }

  // ─── Export Globals ───────────────────────────────────────

  window.SafeQR_Security = {
    // XSS
    escapeHTML: escapeHTML,
    stripHTML: stripHTML,
    sanitizeURL: sanitizeURL,
    escapeAttribute: escapeAttribute,

    // Token
    storeToken: storeToken,
    getToken: getToken,
    clearToken: clearToken,
    isTokenExpired: isTokenExpired,
    parseTokenPayload: parseTokenPayload,

    // Validation
    isValidPhone: isValidPhone,
    isValidAgencyId: isValidAgencyId,
    sanitizeChatMessage: sanitizeChatMessage,

    // Random
    generateRandomToken: generateRandomToken,

    // Session
    isSessionValid: isSessionValid,
    createSession: createSession,
    destroySession: destroySession,

    // Constants
    SESSION_MAX_AGE: SESSION_MAX_AGE,
  };

  console.log('[SafeQR] Security module loaded.');
})();
