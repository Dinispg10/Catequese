# Catequese

Aplicação desktop (Tauri + React + Vite + TypeScript) para gerir matrículas de catequese com dados no Supabase.

## Pré-requisitos (Windows)

- Node.js 18+
- Rust toolchain (https://www.rust-lang.org/tools/install)
- Ferramentas Tauri para Windows:
  - Microsoft Visual Studio Build Tools com "Desktop development with C++"
  - WebView2 Runtime (normalmente já instalado no Windows 11)

## Configuração

1. Copiar `.env.example` para `.env` e preencher:
   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
2. Criar o projeto no Supabase e colar o SQL em `supabase/schema.sql` no SQL Editor.
3. Em Authentication > Users, criar o utilizador partilhado (email + password).
4. Garantir que o Realtime está ligado nas tabelas `alunos` e `presencas_mensais`.
   - O SQL já inclui `alter publication supabase_realtime add table ...`.

## Scripts

```bash
npm install
npm run tauri:dev
npm run tauri:build
```

## Notas

- A app usa login partilhado (uma conta) com RLS ativa.
- O cliente **não** usa `service_role`.
- Listagens podem ser impressas com `Imprimir` (usa `window.print`).
