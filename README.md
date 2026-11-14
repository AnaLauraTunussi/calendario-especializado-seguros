# Calendário Especializado em Seguros

Aplicação web progressiva (PWA), mobile-first, para corretoras de seguros organizarem **vistorias, renovações de apólices, sinistros e reuniões**, com alertas automáticos antes dos vencimentos. Foi projetada para ser acessível (WCAG 2.1 AA) e inclusiva para pessoas autistas (nível 1 de suporte) e daltônicas, em linha com o ODS 8 da ONU (metas 8.2 e 8.5).

## O problema

Corretoras lidam com muitos prazos críticos: uma renovação esquecida pode significar perda de bônus ou um cliente sem cobertura. Agendas comuns misturam informação demais, dependem de cores para comunicar estado e não avisam com antecedência. Este sistema concentra os prazos em uma interface limpa e previsível, que antecipa o que precisa de atenção.

## Como funciona

1. **Agenda.** Ao entrar, o corretor vê um resumo (alertas ativos, pendentes, próximos 7 dias e concluídos) e um calendário mensal com os compromissos coloridos por categoria. Clicar em um cartão de resumo filtra a lista de compromissos.
2. **Agendamento pelo calendário.** Ao clicar em um dia, abre-se um painel ao lado do calendário para escolher o tipo de compromisso. A cor do painel muda conforme a categoria escolhida: Renovação, Vistoria, Sinistro, Reunião ou **Outros**, que aceita um tipo personalizado, como "Cobrança".
3. **Formulário com prévia.** O formulário já vem com a data e a categoria escolhidas. Ao informar com quantos dias de antecedência quer ser avisado, o corretor vê ao vivo quando o alerta será disparado.
4. **Alertas preditivos.** O sistema calcula a data de alerta (data do compromisso menos a antecedência). Quando ela chega, o compromisso sobe para o painel de alertas com três sinais ao mesmo tempo: ícone ⚠, borda tracejada e texto ("Vence em 6 dias").
5. **Conclusão com verificação.** Concluir um compromisso antes ou depois do dia agendado exige confirmação ("Concluir antes da data? Faltam 13 dias"). A regra vale também na API, então nenhum cliente consegue ignorá-la.
6. **Modo escuro e celular.** O tema segue o sistema operacional ou a escolha do usuário. O layout se adapta de telas de 320 px a monitores largos, e o app pode ser instalado no celular.

## Como foi feito

**Arquitetura:** três serviços orquestrados com Docker Compose.

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend | Angular 18 (standalone, signals), CSS puro, FullCalendar 6, Service Worker | Interface, calendário, PWA instalável |
| Backend | NestJS 10, TypeORM, JWT, bcrypt | API REST, regras de negócio, autenticação |
| Banco | PostgreSQL 15 | Usuários e compromissos (`database/init.sql`) |

**Acessibilidade e neuroinclusão**
- Nenhuma informação depende só de cor: toda categoria tem cor, ícone e nome, e todo estado tem ícone e texto.
- Texto com contraste de 7:1 ou mais nos dois temas, fonte de pelo menos 16 px e alvos de toque de pelo menos 44 × 44 px.
- Nada pisca nem se move sozinho, e confirmações aparecem na própria página, sem pop-ups.
- Navegação completa por teclado, foco sempre visível, anúncios para leitores de tela e foco no título a cada troca de página.

**Segurança e LGPD**
- Senhas com bcrypt e sessões com JWT, com limite de tentativas de login.
- Cada usuário acessa apenas os próprios compromissos.
- Entradas validadas com rigor: campos não previstos são recusados.
- Cabeçalhos de segurança (Helmet e CSP), e erros que não expõem detalhes internos.
- Só os dados mínimos são guardados (nome do cliente, sem CPF, RG ou dados bancários), e o app não guarda dados da API no aparelho.
- Em produção, a API não inicia sem as variáveis de ambiente obrigatórias.

**Qualidade**
- O CSS é mobile-first: a base é o celular, com melhorias progressivas a partir de 360, 641, 1024 e 1200 px.
- O backend tem 74 testes automatizados com Jest: 55 unitários (regras de negócio, autenticação, validação, configuração e tratamento de erros) e 19 de integração, que sobem a API completa e fazem requisições HTTP reais contra o PostgreSQL. A cobertura é de **100%** em instruções, decisões, funções e linhas.
- Durante o desenvolvimento, as telas foram auditadas com axe-core (WCAG 2.1 AA) em vários tamanhos e nos dois temas, sem violações.

## Como executar

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm run docker:up
```

- Aplicação: http://localhost:4200
- API: http://localhost:3000/api

Para desenvolver localmente com Node.js 20 ou superior:

```bash
docker compose up -d db
npm install
npm run backend:dev
npm run frontend:dev
```

As variáveis de ambiente do backend estão documentadas em `backend/.env.example`.

### Testes

Com o banco no ar (`docker compose up -d db`), dentro de `backend/`:

```bash
npm test                 # todos os testes (unitários e de integração)
npm run test:unit        # só os unitários
npm run test:integration # só os de integração
npm run test:cov         # todos, com relatório de cobertura
```

## API

Todas as rotas ficam sob `/api`. As de `/eventos` exigem um token JWT.

| Método | Rota | Função |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Cadastro e login |
| GET | `/eventos` | Compromissos ordenados por prioridade |
| GET | `/eventos/alertas` | Compromissos com alerta ativo |
| POST / PUT / DELETE | `/eventos`, `/eventos/:id` | Criar, editar e excluir |
| PATCH | `/eventos/:id/concluir` | Concluir (fora da data, exige confirmação) |

## Licença e privacidade

Projeto de uso restrito (UNLICENSED). Todas as etapas de teste usam dados fictícios, conforme a LGPD.
