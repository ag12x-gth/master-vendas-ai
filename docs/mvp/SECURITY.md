# Políticas de Segurança - ZAP Master

Este documento descreve as práticas e políticas de segurança adotadas no projeto.

## 1. Gestão de Credenciais e Segredos

- **NUNCA** faça commit de segredos (chaves de API, senhas, tokens) diretamente no repositório Git.
- Utilize o ficheiro `.env` para o desenvolvimento local. Este ficheiro está no `.gitignore` e não deve ser versionado.
- Para o ambiente de produção no Firebase Hosting, todos os segredos são armazenados de forma segura no **Google Secret Manager**.
- O acesso aos segredos em produção é gerido por permissões do IAM, concedidas apenas à conta de serviço do Firebase App Hosting.

## 2. Autenticação e Gestão de Sessão

- A autenticação é feita através de **JSON Web Tokens (JWT)**.
- Após o login, o JWT é armazenado num cookie **`httpOnly`**, **`secure`** (em produção) e com `sameSite: 'lax'`. Isto previne o acesso ao token via JavaScript no cliente (XSS) e mitiga ataques CSRF.
- O cookie principal é o `__session`, para compatibilidade com as otimizações de cache do Firebase Hosting.
- As senhas dos utilizadores são sempre hasheadas com `bcryptjs` antes de serem armazenadas no banco de dados.

## 3. Validação de Dados

- Todas as entradas de dados públicos (APIs, formulários) são validadas no backend usando a biblioteca **Zod**.
- Isto garante que apenas dados com o formato e tipo esperados sejam processados, prevenindo ataques de injeção e corrupção de dados.

## 4. Segurança da API

- Todas as rotas de API que manipulam dados de uma empresa específica são protegidas e requerem um JWT válido.
- A lógica de cada endpoint verifica se o `companyId` da requisição (obtido a partir do token) corresponde ao `companyId` do recurso que está a ser acedido, garantindo um isolamento de dados (multi-tenancy) rigoroso.

## 5. Reporte de Vulnerabilidades

- Se encontrar uma vulnerabilidade de segurança, por favor, reporte-a de forma responsável.
- Envie um e-mail para `security@exemplo.com` (substituir pelo e-mail real) com uma descrição detalhada da vulnerabilidade e os passos para a reproduzir.
- **NÃO** divulgue a vulnerabilidade publicamente até que uma correção tenha sido implementada.
