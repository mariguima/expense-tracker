export function securityHeaders(development = false) {
  const scripts = development ? "'self' 'unsafe-inline'" : "'self'";
  const connections = development ? "'self' ws://localhost:5173 ws://127.0.0.1:5173" : "'self'";
  return {
    "Content-Security-Policy": `default-src 'self'; script-src ${scripts}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src ${connections}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  };
}
