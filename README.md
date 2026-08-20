# Carta MZ Pass

Crie uma aplicação web PWA moderna, profissional e altamente interativa chamada Carta MZ Quiz, focada na preparação para o exame teórico de carta de condução em Moçambique.

O objetivo é criar uma plataforma de estudo e simulação de exame que ajude candidatos moçambicanos a aprender, praticar e testar os seus conhecimentos de condução, regras de trânsito e segurança rodoviária.

A aplicação deve ter aparência de um produto profissional que poderia ser utilizado por uma escola de condução moderna em Moçambique.

1. TECNOLOGIA

Utilize uma stack moderna e robusta:

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

Lucide Icons

Supabase para backend

PostgreSQL

PWA com manifest + Service Worker

React Router

TanStack Query quando fizer sentido

Framer Motion para animações

Recharts para estatísticas

Form validation com Zod

Componentes totalmente responsivos

Priorize:

performance

acessibilidade

SEO

mobile-first

funcionamento offline quando possível

excelente UX

arquitetura escalável

código limpo e componentizado

A aplicação deve funcionar perfeitamente em:

smartphones Android

iPhone

tablets

laptops

desktops

2. IDENTIDADE VISUAL

Nome:

Carta MZ Quiz

Slogan:

"Aprende. Pratica. Passa."

Mercado principal:

Moçambique

Idioma principal:

Português de Moçambique (PT-MZ)

Utilize uma identidade visual moderna inspirada no universo automóvel e rodoviário.

Cores sugeridas:

azul escuro

azul elétrico

branco

cinza

vermelho apenas para erros/perigos

verde para respostas corretas

Utilize pequenos elementos visuais inspirados em:

estrada

placas de trânsito

volante

automóveis

semáforos

sinalização rodoviária

Não criar uma interface infantil.

O resultado deve parecer um produto tecnológico premium.

3. PÁGINA INICIAL

Criar uma landing page extremamente moderna.

Hero:

"Carta MZ Quiz"

"Prepare-se melhor para o exame teórico de condução."

Subtexto:

"Pratique questões, descubra os seus pontos fracos e faça simulados completos para chegar ao exame mais preparado."

Botões:

Começar Quiz

Fazer Simulado

Estudar por Tema

Mostrar uma seção com estatísticas:

+500 questões

Simulados completos

Explicações das respostas

Progresso personalizado

Modo offline

Criar uma seção:

"Como funciona?"

Escolha um tema

Responda às questões

Veja a explicação

Reveja os seus erros

Faça simulados

Acompanhe a evolução

Criar também uma seção de categorias.

4. CATEGORIAS DE ESTUDO

Criar pelo menos estas categorias:

Sinais de trânsito

Regras de trânsito

Prioridade e cedência de passagem

Ultrapassagem

Paragem e estacionamento

Velocidade

Distância de segurança

Condução defensiva

Álcool e condução

Fadiga e sono

Stress e comportamento

Segurança rodoviária

Iluminação e condução noturna

Aquaplanagem

Condições meteorológicas

Peões e velocípedes

Veículos pesados

Acidentes e emergência

Mecânica básica

Categorias de carta de condução

Contraordenações e infrações

Condução em zonas urbanas

Condução fora das localidades

Autoestradas e vias rápidas

5. QUESTÕES DOS PDFs

Os três documentos fornecidos são a fonte principal para as questões existentes:

Teste 31

Teste 18

Teste 1 INATTER

IMPORTANTE:

As questões provenientes dos PDFs devem ser identificadas internamente como:

source = "PDF"

E devem manter:

texto original

opções originais

resposta correta

explicação

categoria

dificuldade

Não substituir questões dos PDFs por questões inventadas.

Quando o texto do PDF estiver ilegível ou houver dúvida sobre uma resposta, NÃO inventar.

Marcar a questão como:

needs_review = true

e permitir que um administrador a revise posteriormente.

Criar no banco uma estrutura semelhante a:

questions

id

question_text

option_a

option_b

option_c

option_d

correct_answer

explanation

category_id

difficulty

source

source_document

source_page

image_url

is_verified

needs_review

created_at

6. NOVAS QUESTÕES

Além das questões dos PDFs, criar uma grande biblioteca de questões adicionais de autoria própria.

Estas questões devem ser identificadas como:

source = "AUTHORED"

Não apresentar essas questões como sendo oficiais do INATTER.

Criar pelo menos 300 questões adicionais inicialmente.

Distribuir entre as categorias.

Cada questão deve ter:

pergunta

4 alternativas

apenas uma resposta correta

explicação detalhada

categoria

dificuldade

referência temática

Dificuldades:

Fácil

Médio

Difícil

As questões devem testar raciocínio e conhecimento, e não apenas memorização.

7. IMPORTANTE SOBRE QUESTÕES OFICIAIS

Não afirmar que as questões criadas pela plataforma são questões oficiais do INATTER.

Na interface mostrar:

"Questão proveniente dos materiais fornecidos"

ou:

"Questão de prática criada pela plataforma"

Adicionar no rodapé:

"Esta plataforma é uma ferramenta independente de estudo e não representa oficialmente o INATTER ou qualquer entidade governamental."

8. SISTEMA DE QUIZ

Criar um motor de quiz extremamente interativo.

Cada pergunta deve aparecer em um card moderno.

Exemplo:

┌─────────────────────────────┐
│ Questão 12 de 30 │
│ │
│ Qual é o comportamento... │
│ │
│ ○ A) ... │
│ ○ B) ... │
│ ○ C) ... │
│ ○ D) ... │
│ │
│ [Responder] │
└─────────────────────────────┘

Depois de responder:

Se correta:

"✓ Resposta correta!"

Mostrar explicação.

Se errada:

"✕ Resposta incorreta"

Mostrar:

resposta correta

explicação

dica para memorizar

Adicionar botão:

"Próxima questão"

9. INTERAÇÕES

Adicionar:

animações suaves

progress bar

feedback visual

microinterações

efeitos de acerto

efeitos de erro

contador de questões

temporizador opcional

botão marcar questão

botão eliminar questão

modo escuro

modo claro

Não utilizar animações exageradas.

10. MODOS DE ESTUDO

Criar os seguintes modos:

Modo Prática

Número de questões configurável:

10

20

30

50

100

Sem limite de tempo.

Modo Simulado

Simulação semelhante a um exame real.

Mostrar:

número total de perguntas

tempo restante

progresso

questões respondidas

questões por responder

Não permitir visualizar a resposta antes de terminar.

Modo Contra o Tempo

Temporizador regressivo.

Modo Erros

Mostrar apenas perguntas que o utilizador respondeu incorretamente anteriormente.

Modo Favoritos

Mostrar apenas perguntas marcadas.

Modo Aleatório

Misturar questões de todas as categorias.

11. SISTEMA DE RESULTADO

Depois de terminar:

Mostrar uma página de resultados premium.

Exemplo:

"Simulado concluído!"

85%

"Excelente desempenho!"

Mostrar:

respostas corretas

respostas erradas

perguntas não respondidas

tempo utilizado

taxa de aproveitamento

categoria mais forte

categoria mais fraca

Criar gráfico de desempenho.

Mostrar:

"Você acertou 25 de 30 questões."

Criar botão:

Rever respostas

Refazer simulado

Praticar erros

Voltar ao início

12. SISTEMA DE PROGRESSO

Criar dashboard do utilizador.

Mostrar:

quizzes realizados

questões respondidas

taxa de acerto

melhor resultado

sequência de estudo

tempo estudado

questões dominadas

questões para rever

Criar gráfico:

"Meu desempenho"

Mostrar evolução ao longo dos dias.

13. GAMIFICAÇÃO

Adicionar sistema de XP.

Exemplo:

Resposta correta:

+10 XP

Completar quiz:

+50 XP

Completar simulado:

+100 XP

Criar níveis:

Iniciante

Aprendiz

Condutor

Condutor Avançado

Especialista

Mestre da Estrada

Criar badges:

🏆 Primeiro Quiz
🏆 100 Questões
🏆 10 Simulados
🏆 7 Dias Consecutivos
🏆 90% de Aproveitamento
🏆 Mestre dos Sinais

Criar streak:

"🔥 5 dias seguidos"

14. SISTEMA DE REVISÃO INTELIGENTE

Criar algoritmo simples de repetição espaçada.

Quando o utilizador errar uma questão:

Adicionar à lista de revisão.

Depois de alguns dias, voltar a apresentar a questão.

Criar estados:

Nova

Aprendendo

Em revisão

Dominada

15. DASHBOARD

Criar sidebar ou bottom navigation no mobile.

Itens:

Início

Praticar

Simulados

Categorias

Erros

Favoritos

Progresso

Perfil

No desktop utilizar sidebar.

No mobile utilizar bottom navigation.

16. PÁGINA DE CATEGORIAS

Criar cards:

🚦 Sinais

🚗 Regras de trânsito

↔️ Prioridade

⚠️ Segurança

🍺 Álcool

🌙 Condução noturna

💧 Aquaplanagem

🛣️ Velocidade

etc.

Cada categoria deve mostrar:

número de questões

taxa média de acerto

progresso

botão "Praticar"

17. SISTEMA DE PESQUISA

Adicionar pesquisa global.

Permitir pesquisar:

perguntas

categorias

temas

palavras-chave

Exemplo:

"ultrapassagem"

Mostrar todas as questões relacionadas.

18. FILTROS

Adicionar filtros:

categoria

dificuldade

fonte

respondidas

erradas

favoritas

19. PERFIL DO UTILIZADOR

Criar autenticação com Supabase.

Permitir:

criar conta

login

logout

recuperação de senha

Perfil:

nome

foto/avatar

progresso

nível

XP

badges

histórico

Permitir continuar o último quiz.

20. MODO CONVIDADO

O utilizador deve poder começar a praticar sem criar conta.

Guardar temporariamente:

progresso

respostas

favoritos

Quando criar conta, oferecer sincronização desses dados.

21. FUNCIONAMENTO OFFLINE

Como é uma PWA, implementar:

manifest.json

service worker

cache de assets

página offline

instalação no dispositivo

Mostrar botão:

"Instalar Carta MZ Quiz"

No Android deve funcionar como aplicação instalada.

22. NOTIFICAÇÕES

Preparar estrutura para notificações push.

Exemplos:

"🚗 Está na hora de praticar!"

"🔥 Não perca a sua sequência de 7 dias!"

"📚 Você ainda tem 12 questões para rever."

Não ativar notificações automaticamente sem consentimento.

23. ADMIN DASHBOARD

Criar área:

/admin

Somente utilizadores com role = admin podem acessar.

Criar:

Dashboard
Questões
Categorias
Utilizadores
Estatísticas
Importação
Revisões

24. ADMIN — GESTÃO DE QUESTÕES

Permitir:

criar

editar

apagar

duplicar

pesquisar

filtrar

publicar/despublicar

Mostrar badges:

PDF
AUTHORED
VERIFIED
NEEDS REVIEW

25. IMPORTAÇÃO DE QUESTÕES

Criar uma área para futuramente importar questões dos PDFs.

Permitir:

upload PDF

visualizar documento

extrair texto

revisar questões

corrigir OCR

selecionar resposta correta

definir categoria

salvar

NUNCA publicar automaticamente uma questão extraída por OCR quando a resposta não estiver confirmada.

26. BANCO DE DADOS

Criar tabelas:

users
profiles
roles
questions
question_options
categories
quiz_sessions
quiz_answers
user_progress
favorites
review_queue
badges
user_badges
achievements
notifications

Criar relacionamentos adequados.

Adicionar índices para:

category_id

difficulty

source

created_at

27. SEGURANÇA

Utilizar Supabase Row Level Security.

Regras:

Utilizador normal:

pode visualizar questões publicadas

pode criar suas sessões

pode visualizar seu próprio progresso

pode gerenciar seus favoritos

Admin:

pode gerenciar questões

categorias

utilizadores

conteúdo

Nunca expor:

service role key

secrets

credenciais

chaves privadas

28. RESPONSIVIDADE

Mobile-first.

No smartphone:

cards grandes

botões fáceis de tocar

opções de resposta ocupando boa parte da largura

navegação inferior

Tablet:

layout híbrido.

Desktop:

sidebar + conteúdo central.

29. UX

Adicionar estados:

loading skeleton

empty states

error states

success states

confirmação antes de apagar

toast notifications

Nunca deixar uma página vazia.

30. ACESSIBILIDADE

Garantir:

contraste adequado

navegação por teclado

aria-labels

foco visível

botões acessíveis

tamanho adequado para toque

31. SEO

Adicionar:

title:

"Carta MZ Quiz — Simulados da Carta de Condução em Moçambique"

description:

"Pratique questões de condução, sinais de trânsito e segurança rodoviária com simulados interativos para preparação da carta de condução em Moçambique."

Criar Open Graph metadata.

32. EXPERIÊNCIA PREMIUM

Adicionar:

transições entre páginas

animação de progresso

confetti ao terminar um excelente resultado

cards com glassmorphism moderado

sombras suaves

skeleton loading

dark mode

estados hover

feedback instantâneo

Não exagerar no glassmorphism.

A interface deve parecer uma aplicação profissional, não um template genérico de IA.

33. PRIMEIRO BANCO DE QUESTÕES

Criar a estrutura necessária para importar as questões dos três PDFs fornecidos:

"Teste 31"
"Teste 18"
"Teste 1 INATTER"

As questões provenientes desses documentos devem receber:

source = PDF

source_document = nome do documento

Quando possível, registrar a página de origem.

Para questões cuja leitura esteja incompleta ou cuja resposta correta não possa ser confirmada:

needs_review = true

Não inventar a resposta.

Além disso, criar questões AUTHORED separadas para aumentar a biblioteca.

34. EXPLICAÇÕES

Cada resposta deve possuir explicação educativa.

Exemplo:

Resposta correta:

"B"

Explicação:

"A distância de segurança deve permitir ao condutor reagir e parar o veículo de forma segura caso o veículo da frente reduza a velocidade."

Adicionar:

💡 Dica:

"Quanto maior a velocidade e piores as condições da via, maior deve ser a margem de segurança."

35. SIMULADOR INTELIGENTE

Criar um gerador de simulados.

Configurações:

Número de questões:
10 / 20 / 30 / 40 / 50

Dificuldade:
Todas / Fácil / Médio / Difícil

Categorias:
Todas / Selecionar

Fonte:
Todas / PDFs / Autoria

Tempo:
Sem limite / Temporizado

Permitir:

"Gerar Simulado"

O sistema deve selecionar as questões de forma equilibrada e evitar repetir excessivamente as mesmas perguntas.

36. MODO EXAME

Criar uma interface especial:

"EXAME SIMULADO"

Antes de iniciar mostrar:

Número de perguntas
Tempo
Instruções

Durante o exame:

não mostrar explicações

não revelar respostas

permitir navegar entre perguntas

permitir marcar pergunta para revisão

mostrar cronómetro

Ao terminar:

"Finalizar exame?"

Após confirmação:

calcular resultado.

37. RESULTADO INTELIGENTE

Depois do exame, gerar uma análise:

"Você precisa reforçar: Sinais de trânsito"

"Seu melhor tema: Segurança rodoviária"

Mostrar recomendações:

"Recomendamos praticar mais 20 questões sobre prioridade."

Criar botão:

"Treinar meus pontos fracos"

Esse botão deve gerar automaticamente um quiz baseado nos erros do utilizador.

38. PWA INSTALL EXPERIENCE

Criar um banner elegante:

"Tenha o Carta MZ Quiz no seu telemóvel."

Botão:

"Instalar aplicação"

No desktop:

"Instalar no computador"

39. ESTRUTURA DE ROTAS

Criar:

/
/login
/register
/dashboard
/praticar
/simulados
/simulado/:id
/quiz/:id
/categorias
/categoria/:id
/erros
/favoritos
/progresso
/perfil
/configuracoes
/admin
/admin/questions
/admin/categories
/admin/users
/admin/import

40. PRINCÍPIO FUNDAMENTAL

A aplicação deve distinguir claramente:

QUESTÕES DOS PDFs
→ conteúdo derivado dos materiais fornecidos.

QUESTÕES DE AUTORIA
→ conteúdo adicional criado para treino.

Não misturar as duas fontes sem identificação interna.

Nunca apresentar questões de autoria como questões oficiais.

41. DADOS DEMONSTRATIVOS

Criar dados iniciais suficientes para que a aplicação não pareça vazia.

Criar pelo menos:

20 categorias/temas

300 questões AUTHORED

estrutura para todas as questões dos PDFs

10 badges

dados de exemplo para estatísticas

42. QUALIDADE FINAL

Antes de considerar o projeto concluído:

verificar todos os links

verificar todas as rotas

testar login

testar logout

testar quiz

testar respostas

testar cálculo de pontuação

testar temporizador

testar favoritos

testar revisão

testar progresso

testar modo escuro

testar PWA

testar mobile

testar desktop

testar RLS

testar permissões admin

Corrigir erros de TypeScript.

Eliminar componentes quebrados.

Não deixar TODOs críticos.

Não utilizar dados falsos onde deveriam existir dados reais.

43. EXPERIÊNCIA QUE QUERO

Quando o utilizador abrir o site, quero que pense:

"Isso parece uma aplicação profissional de preparação para a carta de condução."

A experiência deve ser rápida, moderna, divertida e educativa.

O foco é:

Moçambique + Carta de Condução + Quiz + Simulados + Aprendizagem + Gamificação + PWA.

Construa primeiro uma versão funcional completa e depois refine a interface visual.

Não criar apenas uma landing page.

Criar uma aplicação real, funcional e escalável.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://carta-mz-drive-prep.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9715ad75-577e-4100-9906-ec645865b80d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
