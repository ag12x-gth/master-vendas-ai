export function getBaseUrl(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  if (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return 'http://localhost:5000';
}
