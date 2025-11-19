// src/app/page.tsx
import { redirect } from 'next/navigation';

/**
 * Master IA Oficial - WhatsApp Communication Platform
 * 
 * Este componente serve como ponto de entrada da aplicação.
 * A sua única função é redirecionar imediatamente o utilizador
 * para a página de login, que é o início do fluxo de autenticação.
 * 
 * ✅ App Testing ATIVO - Sistema pronto para testes automáticos em tempo real
 * ✅ Hydration fix implementado - useResponsive agora sincronizado
 * ✅ Servidor otimizado para preview e replay no chat do Agent
 */
export default function RootPage() {
  redirect('/login');
}
