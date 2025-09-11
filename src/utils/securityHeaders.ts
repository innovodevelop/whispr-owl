// Security headers for enhanced protection

export function applySecurityHeaders() {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://pwhofxthijramblrjmxr.supabase.co https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');

  // Apply meta tags if not already present
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const cspMeta = document.createElement('meta');
    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    cspMeta.setAttribute('content', csp);
    document.head.appendChild(cspMeta);
  }

  // X-Frame-Options
  if (!document.querySelector('meta[http-equiv="X-Frame-Options"]')) {
    const frameMeta = document.createElement('meta');
    frameMeta.setAttribute('http-equiv', 'X-Frame-Options');
    frameMeta.setAttribute('content', 'DENY');
    document.head.appendChild(frameMeta);
  }

  // X-Content-Type-Options
  if (!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
    const contentTypeMeta = document.createElement('meta');
    contentTypeMeta.setAttribute('http-equiv', 'X-Content-Type-Options');
    contentTypeMeta.setAttribute('content', 'nosniff');
    document.head.appendChild(contentTypeMeta);
  }

  // Referrer Policy
  if (!document.querySelector('meta[name="referrer"]')) {
    const referrerMeta = document.createElement('meta');
    referrerMeta.setAttribute('name', 'referrer');
    referrerMeta.setAttribute('content', 'strict-origin-when-cross-origin');
    document.head.appendChild(referrerMeta);
  }

  // Permissions Policy
  if (!document.querySelector('meta[http-equiv="Permissions-Policy"]')) {
    const permissionsMeta = document.createElement('meta');
    permissionsMeta.setAttribute('http-equiv', 'Permissions-Policy');
    permissionsMeta.setAttribute('content', 'camera=(), microphone=(), geolocation=(), payment=()');
    document.head.appendChild(permissionsMeta);
  }
}

// Initialize security headers when this module is imported
if (typeof document !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySecurityHeaders);
  } else {
    applySecurityHeaders();
  }
}