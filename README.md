# nadbid.fun

A gamified blockchain auction platform for KOL social interactions. Users bid on social
promotions (pinned tweets, shoutouts, meme creation) offered by KOLs; the final valid bid
wins the auction.

Built with React 19, TypeScript (strict), Vite, Tailwind CSS v4 and react-router.
The UI follows a neo-brutalist design system defined in `src/index.css`.

## Getting started

Prerequisites: Node.js 20+.

```bash
npm install
npm run dev
```

The dev server starts on http://localhost:3000.

## Scripts

| Script                 | Purpose                                |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | Start the Vite dev server              |
| `npm run build`        | Production build into `dist/`          |
| `npm run preview`      | Preview the production build           |
| `npm run typecheck`    | TypeScript strict type check (no emit) |
| `npm run lint`         | ESLint (TS + React Hooks rules)        |
| `npm run lint:fix`     | ESLint with auto-fix                   |
| `npm run format`       | Prettier write                         |
| `npm run format:check` | Prettier check (for CI)                |

## Project structure

```
src/
  components/          # Reusable feature components
    ui/                # Design-system primitives (StatItem, StatusBadge, ...)
    auction-detail/    # Sub-components of the auction detail page
  pages/               # Route-level components (Home, KOLs, AuctionDetail, NotFound)
  data/                # Mock data modules (swap for API calls later)
  types/               # Shared TypeScript interfaces
  constants/           # Brand strings and theme values for JS contexts
```

## Conventions

- Strict TypeScript: no implicit `any`, no unused locals/parameters.
- Prefer `type` imports (`import type { Bidder } from '@/types'`).
- Colors in JSX must use theme tokens (`text-primary`, `bg-secondary`, ...),
  not hex values. Tokens live in `src/index.css` (`@theme`); JS-side mirrors
  live in `src/constants/theme.ts`.
- Mock data lives in `src/data/*`, never inside components.
- Path alias: `@/` maps to `src/` (keep `tsconfig.json` and `vite.config.ts` in sync).

## Environment

Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY` if server-side
Gemini features are used. `APP_URL` is injected automatically when deployed.
