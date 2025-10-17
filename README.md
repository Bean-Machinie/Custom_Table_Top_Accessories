# Custom Table Top Accessories Editor

A TypeScript-first React + Supabase single-page application for designing custom tabletop accessories. The app ships with a token-driven UI system, a performant playground for arranging layers, and adapters for persisting data and assets to Supabase.

## Packages

- **web** – React + Vite frontend featuring the editor experience, UI primitives, state stores, and Supabase adapters.
- **shared** – Shared TypeScript types for documents, layers, transforms, and viewport state.

## Getting Started

```bash
cd web
npm install
npm run dev
```

### Available Scripts

- `npm run dev` – start the Vite dev server on port 5173.
- `npm run build` – type-check and build the SPA to `dist/`.
- `npm run preview` – preview the built app locally.
- `npm run lint` – run ESLint with the provided TypeScript ruleset.
- `npm run test` – execute unit and component tests via Vitest.
- `npm run deploy` – build and deploy the `dist/` directory to GitHub Pages.

## Environment Variables

Copy `.env.example` to `.env` and populate with your Supabase project credentials.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_SUPABASE_BUCKET=assets
VITE_DEFAULT_PROJECT_NAME=Bean Machine
```

## Project Structure

```
/web
  /components       # UI primitives & editor composites
  /features         # Feature-specific modules (documents, layers, assets)
  /stores           # Editor and viewport stores
  /lib              # Utilities (persistence, transforms, portals)
  /adapters         # Supabase database & storage adapters
/shared             # Shared types consumed by the web package
```

## Testing

The project uses Vitest and Testing Library for both unit tests and accessibility smoke tests. Run `npm run test` from the `web` directory to execute the suite.

## Deployment

Use `npm run deploy` from the `web` directory to build and deploy the static site to GitHub Pages. Ensure GitHub Pages is configured to serve from the `gh-pages` branch created by the deployment script.
