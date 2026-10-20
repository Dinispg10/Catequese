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

## Atualizações automáticas

As apps instaladas procuram versões novas sozinhas ao abrir (e no botão "Procurar
atualizações" no fundo da barra lateral). As versões são publicadas pelo GitHub Actions
(`.github/workflows/release.yml`, na raiz do repositório) no repositório **público**
`Dinispg10/Catequese` — tem de ser público para as apps conseguirem descarregar o
`latest.json` sem login.

### Publicar uma versão nova

```bash
npm run versao 0.2.0
git commit -am "Versão 0.2.0"
git tag v0.2.0
git push && git push --tags
```

O workflow recusa-se a publicar se a tag não bater com a versão do `tauri.conf.json`.

### Segredos no GitHub (Settings → Secrets and variables → Actions)

| Segredo | De onde vem |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | conteúdo de `~/.tauri/catequese.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | conteúdo de `~/.tauri/catequese.key.password.txt` |
| `VITE_SUPABASE_URL` | o mesmo do `.env` |
| `VITE_SUPABASE_ANON_KEY` | o mesmo do `.env` |

### ⚠ Não percas a chave de assinatura

As apps só aceitam atualizações assinadas com `~/.tauri/catequese.key`. Se a chave ou a
palavra-passe se perderem, as apps já instaladas nunca mais se atualizam e é preciso
reinstalar à mão em todos os computadores. Guarda os dois ficheiros num sítio seguro fora
deste computador. A chave **nunca** vai para o repositório.

## Notas

- A app usa login partilhado (uma conta) com RLS ativa.
- O cliente **não** usa `service_role`.
- Listagens podem ser impressas com `Imprimir` (usa `window.print`).
