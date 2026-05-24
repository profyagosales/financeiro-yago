# Brand · Financeiro do Yago

Sistema visual de marca. Use **sempre** os arquivos abaixo — não recrie/regere.

## Conceito

**Monograma FY**: ligadura tipográfica F+Y inspirada na Fraunces (fonte de display do app),
sobre cartão roxo escuro com glow dourado sutil. Accent de cor única (gota dourada `#F2C745`)
marca o ponto de cruzamento do Y.

A marca **conversa com** (não conflita com) a aura visual já existente no app:
- Hero do Dashboard (gradient roxo)
- Cards de KPI (paleta consistente)
- Acento dourado/laranja da identidade
- Tipografia Fraunces + Plus Jakarta Sans

## Paleta (somente cores já existentes no app)

| Token        | Hex       | Uso                                           |
|--------------|-----------|-----------------------------------------------|
| Purple-deep  | `#2A1E3F` | Cartão da marca (início do gradient)          |
| Purple-mid   | `#3D3457` | Cartão da marca (fim do gradient)             |
| Gold-light   | `#F2C745` | Accent / dot dourado                          |
| Gold-mid     | `#D4A017` | Halo sutil por trás do monograma              |
| Orange       | `#C4553B` | Ponto após "Financeiro" no wordmark           |
| Orange-bright| `#F1642E` | Variante sidebar                              |
| Cream-light  | `#FBF8F3` | Monograma (início do gradient)                |
| Cream-mid    | `#D4D0C5` | Monograma (fim do gradient)                   |
| Text         | `#2C1A0F` | Wordmark sobre claro                          |
| Muted        | `#7A5C4F` | "DO YAGO" no wordmark                         |

## Arquivos

### Símbolo (mark)

| Arquivo                          | Quando usar                                                  |
|----------------------------------|--------------------------------------------------------------|
| `mark.svg`                       | Versão padrão full-color (cartão + monograma + accent)       |
| `mark-mono-white.svg`            | Monocromático branco — sobre fundos coloridos sólidos        |
| `mark-mono-dark.svg`             | Monocromático escuro — sobre fundos claros minimalistas      |

### Lockups

| Arquivo                          | Quando usar                                                  |
|----------------------------------|--------------------------------------------------------------|
| `logo-horizontal.svg`            | Headers, e-mails, assinaturas, splash de loading             |
| `logo-vertical.svg`              | Tela de login, splash mobile, telas amplas centralizadas     |
| `wordmark.svg`                   | Quando só o texto faz sentido (cabeçalhos longos, footer)    |

### Sistema operacional / PWA (em `/public/`)

| Arquivo                          | Onde é consumido                                              |
|----------------------------------|--------------------------------------------------------------|
| `/favicon.svg`                   | Aba do navegador, bookmarks, history                          |
| `/icon-192.svg`                  | PWA padrão Android (purpose: any)                             |
| `/icon-512.svg`                  | PWA grande (splash, instalação)                               |
| `/icon-maskable-512.svg`         | Android adaptive icons (safe area 60% central)                |
| `/apple-touch-icon.svg`          | iOS — home screen (180x180)                                   |

### Notificações e social

| Arquivo                          | Quando usar                                                  |
|----------------------------------|--------------------------------------------------------------|
| `brand/notification-badge.svg`   | Badge silhueta branca em push notifications                   |
| `brand/og-image.svg`             | Open Graph (1200×630) — compartilhamento social               |

## Uso no código React

Use o componente `<Logo />` exportado de `@/components/brand`:

```tsx
import { Logo } from '@/components/brand'

// Símbolo padrão
<Logo variant="mark" size={48} />

// Lockup horizontal pra header
<Logo variant="horizontal" size={56} />

// Monocromático branco sobre fundo escuro
<Logo variant="mark-mono" tone="white" size={32} />

// Wordmark sem o ponto laranja
<Logo variant="wordmark" size={28} cleanDot />
```

## Spacing & safe area

- **Espaço livre mínimo ao redor da marca** = altura do "F" no monograma.
  Não cole texto/UI grudado.
- **Tamanho mínimo do símbolo full-color** = 24×24px. Abaixo disso, use mono.
- **Tamanho mínimo do lockup horizontal** = altura 28px. Abaixo, use só o símbolo.

## Não fazer (don'ts)

- Não trocar as cores. A paleta é a do app.
- Não rotacionar, inclinar ou distorcer.
- Não preencher o "Y" (deve sempre ser stroke).
- Não substituir o accent dourado por outra cor.
- Não usar `mark.svg` (cartão) sobre fundos coloridos vibrantes — use a versão mono.
- Não usar wordmark sem o `tspan` laranja em contextos onde for o único elemento da marca.

## Aprovação

Conceito **C — Monograma FY** aprovado pelo Yago.
Data: 2026-05-24
