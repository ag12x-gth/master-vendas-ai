// src/app/page.tsx
import { redirect } from 'next/navigation';

/**
 * Este componente serve como ponto de entrada da aplicação.
 * A sua única função é redirecionar imediatamente o utilizador
 * para a página de login, que é o início do fluxo de autenticação.
 * 
 * App Testing ativo - Sistema pronto para testes automáticos
 */
export default function RootPage() {
  redirect('/login');
}
