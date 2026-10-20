# Repository Guidelines

## Project Structure & Module Organization

This is a static Astro 5 application using TypeScript and browser Canvas/SVG rendering.

- `src/pages/index.astro`: page shell, metadata, and global stylesheet import.
- `src/components/AvatarCreator.astro`: editor markup, browser interactions, and component styles.
- `src/lib/`: avatar parts and state types (`avatar-data.ts`), composition/rendering/export helpers (`renderer.ts`), and color utilities (`palettes.ts`).
- `src/styles/global.css`: shared tokens, typography, and base styles.
- `public/`: served reference images; root-level `8-bit_*.jpg` files are design references.
- `DESIGN.md` and `PRODUCT.md`: visual and product requirements.
- `.github/workflows/deploy.yml`: GitHub Pages deployment. Generated `dist/` and `.astro/` directories are ignored.

## Build, Test, and Development Commands

Use Node.js 20 to match CI and npm with the committed `package-lock.json`.

- `npm ci`: install locked dependencies reproducibly.
- `npm run dev` (or `npm start`): start the local development server.
- `npm run build`: generate the static site in `dist/`; this is the CI build check.
- `npm run preview`: serve the production build locally after building.

Use the configured `/avatar-creator/` base path when opening the site.

## Coding Style & Naming Conventions

Follow existing two-space indentation, single-quoted TypeScript strings, and semicolons. TypeScript extends Astro's strict configuration. Use PascalCase for components and types, camelCase for functions and variables, UPPER_SNAKE_CASE for shared constants, and kebab-case for CSS classes and part IDs. Keep reusable rendering logic in `src/lib/` and reuse CSS custom properties. No formatter or linter is configured.

## Testing Guidelines

There is no automated test framework, test script, coverage threshold, or established test naming convention. Run `npm run build`, then manually verify part selection, randomization, horizontal flipping, monochrome/palette switching, custom colors, and PNG/SVG downloads. Check desktop and mobile layouts and confirm exported pixels remain sharp. If introducing automated tests, document the runner and command and use descriptive `*.test.ts` filenames.

## Commit & Pull Request Guidelines

History uses Conventional Commit-style `feat:` subjects with English or Traditional Chinese descriptions. Continue concise, action-oriented subjects; use an appropriate prefix such as `fix:` or `docs:` for other changes.

Pull requests should describe the change, link relevant issues, record build/manual checks, and include screenshots for visible changes.

## Rendering & Deployment Constraints

Preserve the 32×32 integer grid, layer order, and disabled image smoothing. Follow `DESIGN.md` for monochrome UI styling and retain Traditional Chinese UI copy. Respect `import.meta.env.BASE_URL` for site links. Pushes to `main` trigger GitHub Pages deployment.
