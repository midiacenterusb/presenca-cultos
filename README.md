# Registro — Presença nos Cultos

App simples para controlar presença no culto diário do escritório (segunda a sexta), com relatório mensal e comparativo entre meses.

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com), crie um projeto novo (gratuito).
2. Vá em **SQL Editor**, cole o conteúdo de `schema.sql` e execute. Isso cria as tabelas `membros`, `dias_sem_culto` e `presencas`, já com segurança (RLS) configurada para exigir login.
3. Vá em **Authentication → Users → Add user** e crie seu usuário (e-mail e senha) — é com ele que você vai entrar no app. Não existe tela de cadastro dentro do app, de propósito, já que é de uso pessoal.
4. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**

## 2. Configurar o app

Abra `app.js` e substitua as duas primeiras linhas de configuração:

```js
const SUPABASE_URL = 'COLE_AQUI_SUA_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'COLE_AQUI_SUA_SUPABASE_ANON_KEY';
```

## 3. Publicar

Mais simples: arraste a pasta inteira (`index.html`, `styles.css`, `app.js`) para [Netlify Drop](https://app.netlify.com/drop) — gera um link em segundos. Também funciona em Vercel, GitHub Pages ou qualquer hospedagem estática.

## Como funciona

- **Presença**: qualquer dia útil (seg–sex) que não esteja marcado em Feriados é considerado dia de culto. Marque quem esteve presente e salve.
- **Membros**: cadastre e desative (sem apagar) quem sai da equipe — o histórico de presença se mantém.
- **Feriados**: cadastre manualmente os dias sem culto (feriados, viagens, etc.). Esses dias saem da conta de "dias de culto no mês".
- **Relatórios → Mensal**: total de dias de culto no mês, presença média por dia, e presença individual (nº e %) de cada membro.
- **Relatórios → Comparativo**: evolução da presença média nos últimos 3/6/12 meses, e uma tabela com o % de presença de cada membro mês a mês.

## Observação

Não existe importação em massa de membros — cadastre um a um na aba Membros antes do primeiro registro de presença.
