# SpaceSketch frontend

This folder is the complete Next.js application, including the 2D/3D editor, dashboard, browser-side Supabase integration, assets, and tests.

From this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Alternatively, run `npm run setup` and `npm run dev` from the repository root.

Copy `.env.example` to `.env.local` here to configure the Supabase URL and public browser key. Without those variables, the local demo works using browser storage. Apply the migration described in [the backend setup](../backend/README.md) before using cloud features.

Commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, and `npm start`. Browser tests use installed Google Chrome and start their own development server.

For Vercel, set the project's **Root Directory** to `frontend`, select the Next.js preset, and use `npm ci` / `npm run build` as the install/build commands.

See the [repository README](../README.md) for features, architecture, controls, and known limitations.
