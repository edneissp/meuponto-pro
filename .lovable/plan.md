

# Correção: Login Carregando Infinitamente

## Diagnóstico

Identifiquei **3 problemas críticos** que causam o loop infinito de carregamento:

### Problema 1 — `signOut()` antes do `signIn()` no Login
Em `handleLogin`, o código chama `supabase.auth.signOut()` antes de fazer login. Isso dispara o evento `SIGNED_OUT` no `TenantContext`, que executa `purgeAllStorage()` (apaga todo localStorage). Há uma **race condition**: o evento `SIGNED_OUT` pode chegar DEPOIS do `SIGNED_IN`, destruindo a sessão recém-criada.

### Problema 2 — Sem timeout/finally na verificação de sessão
O `useEffect` do Login que verifica sessão existente (`checkingSession`) não tem `finally` nem timeout. Se `getUser()` travar ou falhar de forma inesperada, o spinner fica infinito.

### Problema 3 — Deduplicação no TenantContext pode bloquear loading
Se `loadTenant` é chamado para o mesmo `uid` duas vezes (INITIAL_SESSION + SIGNED_IN), a segunda chamada é ignorada silenciosamente. Se a primeira falhou silenciosamente sem limpar `loadingRef`, o estado `loading` fica `true` para sempre.

---

## Plano de Correção

### 1. Corrigir `handleLogin` no Login.tsx
- **Remover** o `signOut()` antes do login — não é necessário e causa a race condition
- Envolver em `try/catch/finally` com `setLoading(false)` no `finally`
- Adicionar timeout de segurança (10s) para garantir que loading sempre termine

### 2. Corrigir verificação de sessão no Login.tsx
- Adicionar `finally` no bloco de verificação para garantir `setCheckingSession(false)`
- Adicionar timeout de 5s como fallback — se a verificação não completar, mostrar o formulário

### 3. Corrigir TenantContext
- Na deduplicação do `loadTenant`, verificar se o tenant já foi carregado com sucesso (não apenas se o uid é o mesmo) — se `loading` ainda é `true` e `loadingRef` já tem o uid, permitir nova tentativa
- Garantir que `loading = false` em todos os caminhos de execução

### 4. Corrigir AppLayout
- Adicionar `try/catch` no `checkAuth` do AppLayout para evitar que erro na busca de tenant/perfil trave a interface
- Mostrar mensagem de erro se o carregamento falhar

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/Login.tsx` | Remover signOut pré-login, adicionar try/catch/finally, timeout de segurança |
| `src/contexts/TenantContext.tsx` | Corrigir lógica de deduplicação, garantir loading=false em todos os caminhos |
| `src/components/AppLayout.tsx` | Adicionar try/catch no checkAuth |

Nenhum módulo existente (PDV, mesas, financeiro, etc.) será alterado.

