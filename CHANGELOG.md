# Changelog — Financeiro do Yago

## [Produção] — Deploy `dpl_8JWV6UhL28yu4KronT6HPnfEQF8W`

**URL**: https://financeiro-yago.vercel.app  
**Repositório**: https://github.com/profyagosales/financeiro-yago  
**Projeto Vercel**: interlinhas-projects/financeiro-yago

---

## Sessão de redesign — 22 mai 2026

### `2da7b89` — feat: redesign full-width em todas as páginas internas

Todas as páginas internas migradas de coluna única estreita para layouts
full-width com grid responsivo.

**Contas Fixas**
- Padding: 32px
- KPI strip 3-col: Pago (teal) / Pendente (terra) / Total
- Lista em `grid auto-fill minmax(320px, 1fr)` — 2-col no desktop
- Título h1 38px Fraunces + subtítulo contextual

**Metas & Orçamento**
- Tab switcher compacto (pill, não barra larga saturada)
- Metas em `grid auto-fill minmax(300px, 1fr)`
- Orçamentos em grid igual

**Parcelamentos**
- Header do cartão: branco com `border-left: 4px solid {cor}` (sem gradiente saturado)
- Mini-chart CSS horizontal de proporção dos top-5
- Summary card com 3 KPIs (por mês / total restante / em aberto)

**Patrimônio**
- KPI líquido com 3 sub-blocos internos: Ativos / Passivos / Cobertura
- Listas em `grid auto-fill minmax(280px, 1fr)`

**Relatórios**
- 3 tabs: Visão Geral / Categorias / Tendências
- Cada tab usa grid 2-col no desktop
- Charts height 260px+ (era 180px)
- `DarkTooltip` customizado em todos os gráficos

**Transações**
- Rows mais densas com informação contextual
- Date headers com pills coloridas (Hoje em terra)
- Filtros reformatados e mais compactos

---

### `2acb311` — fix: remove cards escuros marrons

**Problema**: cards Saldo Total e Panorama usavam gradientes escuros
que resultavam em marrom/preto quando a cor terra (`#C4553B`) é escurecida.

**Solução**:
- **Saldo Total**: glassmorphism branco + `border-top: 3px solid #C4553B`
- **Panorama**: glassmorphism branco + mini-cards internos teal/terra
  para Entradas/Saídas

**Regra**: nunca usar `darkenHex(#C4553B, N%)` como fundo — vira marrom.
Usar a cor como acento (border, ícone, texto) em fundos claros.

---

### `19224ae` — feat: glassmorphism + fundo branco + mesh vibrante

**Background**: `#FAF6F0` (creme marrom) → `#FFFFFF` (branco puro)

**Background Mesh** (AppShell, fixo em todas as páginas):
- 4 orbs animados com `x/y/scale` via Framer Motion
- Opacidades: 0.32 / 0.26 / 0.22 / 0.14 (era 0.07)
- Tamanhos: 700 / 580 / 500 / 440px

**Cards**: todos com glassmorphism real:
```
background: rgba(255,255,255,0.72)
backdrop-filter: blur(18px) saturate(1.4)
border: 1px solid rgba(255,255,255,0.6)
```

**Utilities CSS adicionadas** (`index.css`):
- `.glass` — glassmorphism padrão
- `.glass-strong` — glassmorphism forte (modais)
- `.glass-dark` — glassmorphism escuro
- `.grain` — grain texture overlay (28% opacity)
- `.shimmer-hover` — efeito shimmer no hover
- `.glow-terra` / `.glow-teal` / `.glow-amber` — glow por cor

---

### `1491ff2` — feat: KPIs com identidades visuais únicas

Cada KPI block do Dashboard ganhou sua própria identidade:

| KPI | Fundo | Cor texto |
|-----|-------|-----------|
| Saldo Total | Glassmorphism + border-top terra | `#2C1A0F` |
| Entradas | Teal translúcido `rgba(58,133,128,0.28)` | `#3A8580` |
| Saídas | Terra translúcido `rgba(196,85,59,0.25)` | `#C4553B` |
| Poupança | Dinâmico por taxa (verde/âmbar/vermelho) | Dinâmico |

---

### `046535d` — feat: redesign total layout — bento grid, full-width

**Mudança estrutural principal**: removido `maxWidth: 900px` de TODAS as
páginas. Conteúdo agora usa 100% da largura disponível.

**Dashboard**: layout bento grid 5 linhas:
```
ROW 1: Greeting + Dobrão + data + badge mês
ROW 2: 4 KPIs (Saldo / Entradas / Saídas / Poupança)
ROW 3: Panorama (2/3) + Por categoria (1/3)
ROW 4: Contas em scroll horizontal
ROW 5: Últimas transações (3/5) + Resumo do mês (2/5)
```

**Padding padrão global**: `32px` (era `24px 28px`)

---

### `1a9834f` — feat: sidebar escuro premium

**Antes**: sidebar branco sobre fundo creme → zero separação visual  
**Depois**: dark gradient `#1C0A05 → #0E0603`

Especificações:
- Texto: `rgba(255,255,255,0.55)` normal, `0.95` ativo
- Item ativo: `background: rgba(196,85,59,0.18)` + `inset 3px 0 0 #C4553B`
- Badges urgentes: terra sólido `#C4553B`
- Shadow: `4px 0 24px rgba(10,4,2,0.3)` (separação lateral)
- Width: 248px expandido, 64px recolhido

---

### `6aa0745` — fix: correção de bug — categorias duplicadas

**Bug**: `seedCategories()` chamado em `App.tsx` E `DashboardPage.tsx`
simultaneamente → race condition → categorias duplicadas no IndexedDB.

**Fix**:
- Mutex `_seeding` na função `seedCategories`
- `deduplicateCategories()` executada no boot via `.then()`
- Removida chamada duplicada do `DashboardPage`

---

### `de702a6` — feat: gráficos e visualizações premium

**Relatórios — 3 tabs completos**:
- Visão Geral: KPIs + comparativo + taxa de poupança
- Categorias: Donut com total no centro + barras horizontais + %
- Tendências: AreaChart duplo + gastos por dia + LineChart acumulado

**Cartões — FaturaSheet redesign**:
- 3 tabs: Lançamentos / Categorias / Resumo
- Tab Resumo: ring SVG animado de uso do limite (muda cor em 60%/80%)

**Parcelamentos**: CartaoGroup sem gradiente blob, com border-left

**Transações**: mini sparkline 70px ao filtrar por mês

---

## Design System

### Paleta
```
--terra:    #C4553B   (primary, ação, despesa)
--teal:     #3A8580   (receita, positivo, sucesso)
--amber:    #D4A017   (alerta, atenção)
--dark:     #2C1A0F   (texto primário)
--muted:    #9B7B6A   (texto secundário)
--border:   #EDE6DC   (bordas)
```

### Fontes
- **Fraunces** (serif) — títulos, números financeiros, h1/h2
- **Plus Jakarta Sans** (sans) — UI, labels, corpo

### Sombras
```
sm:  0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)
md:  0 4px 12px rgba(44,26,15,0.08), 0 2px 4px rgba(44,26,15,0.04)
lg:  0 8px 32px rgba(44,26,15,0.12), 0 4px 8px rgba(44,26,15,0.06)
xl:  0 20px 60px rgba(44,26,15,0.16), 0 8px 20px rgba(44,26,15,0.08)
```

### Animações
```
Spring padrão: stiffness 260, damping 26
Stagger lista: 40ms por item
Page enter: opacity + y(20) + blur(4px)
Card hover: y(-4) + shadow increase
```

### Card Glassmorphism
```
background:      rgba(255,255,255,0.72)
backdrop-filter: blur(18px) saturate(1.4)
border:          1px solid rgba(255,255,255,0.6)
border-radius:   22px
box-shadow:      0 8px 32px rgba(44,26,15,0.07)
```
