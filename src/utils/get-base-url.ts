export function getBaseUrl(): string {
  // Em produção/desenvolvimento: usar o endereço atual 
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // No servidor: usar variável de ambiente
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  if (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  return 'http://localhost:5000';
}
