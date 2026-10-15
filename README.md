# 🇲🇿 CartaMZ — Preparação para o Exame Teórico de Condução em Moçambique

Plataforma web em português para ajudar candidatos à carta de condução em Moçambique a estudar e a praticar o exame teórico, com questionários por tema, simulados com temporizador e acompanhamento do progresso.

🔗 **Demo online:** [carta-mz-drive-prep-wuqw.vercel.app](https://carta-mz-drive-prep-wuqw.vercel.app)


## 🎯 Objetivo

Tornar o estudo para o exame teórico de condução mais acessível e organizado, com uma ferramenta pensada para o contexto moçambicano: conteúdos locais, interface em português e uso confortável no telemóvel.

## ✨ Funcionalidades

- **Questionários por tema:** perguntas sobre regras de trânsito, sinalização e segurança, organizadas por categorias.
- **Simulados de exame:** testes com temporizador e cálculo da pontuação.
- **Progresso:** estatísticas de desempenho para identificar os temas que precisam de mais prática.
- **Contas de utilizador:** registo, autenticação e acesso personalizado.
- **Planos:** estrutura de planos Free, Pro e Premium, com limites de acesso diferentes.
- **Painel de administração:** importação e organização de perguntas a partir de PDFs, com apoio de OCR e IA.
- **Design responsivo:** pensado primeiro para telemóvel e adaptado a tablets e computadores.

## 🛠️ Tecnologias

| Área | Ferramentas |
|------|-------------|
| Interface | React, TypeScript, Tailwind CSS, shadcn/ui |
| Aplicação | TanStack Start, TanStack Router, TanStack Query |
| Backend e dados | Supabase (autenticação e PostgreSQL), Drizzle |
| Validação e gráficos | Zod, Recharts |
| Testes | Vitest |
| Publicação | Vercel |

## 🚀 Como correr localmente

Requisitos: Node.js 18+ (ou Bun) e um projeto no [Supabase](https://supabase.com).

```bash
# 1. Clonar o repositório
git clone https://github.com/Filimao/carta-mz-drive-prep.git
cd carta-mz-drive-prep

# 2. Instalar as dependências
npm install

# 3. Criar o ficheiro .env na raiz do projeto (veja abaixo)

# 4. Iniciar em modo de desenvolvimento
npm run dev
```

Variáveis de ambiente do ficheiro `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

> O ficheiro `.env` não deve ser enviado para o GitHub. Use sempre apenas a chave pública (`anon` / publishable) do Supabase no código do cliente e nunca coloque chaves secretas.

Outros comandos:

```bash
npm run build   # gerar a versão de produção
npm run test    # correr os testes (Vitest)
npm run lint    # verificar o código
```

## 📌 Estado do projeto

Em desenvolvimento. Próximos passos previstos:

- Mais perguntas e novas categorias de estudo.
- Melhorias no modo de estudo offline.
- Revisão dos erros por tema após cada simulado.

## ⚠️ Aviso

O CartaMZ é uma plataforma independente de apoio ao estudo. Não representa nem substitui os serviços, os exames oficiais ou os materiais publicados pelas autoridades de trânsito de Moçambique. Confirme sempre as informações em fontes oficiais.

## 👤 Autor

**Filimão Feliz Mondlane** — Full-Stack Developer, Maputo, Moçambique
[GitHub](https://github.com/Filimao) · [LinkedIn](https://linkedin.com/in/filimaomondlane)
