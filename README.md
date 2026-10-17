<p align="center">
  <img src="frontend/public/spacesketch-logo.png" alt="SpaceSketch" width="300" />
</p>

# SpaceSketch

Design interior and outdoor spaces with a connected **2D floor plan and 3D editor**. Draw rooms, resize walls, place furniture, edit windows and doors, and add outdoor surfaces.

SpaceSketch works locally without an account. Supabase provides optional authentication, cloud storage for projects, version history, and shared viewing.

## Quick start

Prerequisites: Node.js 22.12 or newer, npm, and a browser with WebGL support for 3D editing. Development has been verified with Node.js 24.

From the repository root:

```sh
npm run setup
npm run dev
```

Open [localhost:3000](http://localhost:3000). No environment variables are required for local demo mode.

`npm run setup` installs the locked dependencies in `frontend/`. Root scripts forward to that package. You can also run `npm ci` and `npm run dev` directly from `frontend/`.

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## Features

### Rooms, walls, and openings

- Eight starter layouts, including furnished bedrooms, kitchens, offices, a two-room studio apartment, and an outdoor patio with lawn and a path.
- Rectangular and polygon rooms, connected walls, wall splitting, room resizing, and visibility controls.
- Live wall resizing with handles at both endpoints and the top in 3D; endpoint and height controls in 2D. Connected room boundaries follow the changes.
- Draggable windows and doors with width, height, sill, and position controls. Choose classic, sliding, or double styles.
- Opening fit and overlap validation. Live handle previews keep the last valid geometry, support Escape cancellation, and commit one undo step on release.
- 2D alignment guides, furniture center/edge snapping, wall-edge snapping, opening positioning assistance, and spacing labels.

### Furniture and materials

- **28 furniture types** with rendered 3D catalog thumbnails and icon fallbacks.
- Indoor pieces plus garden benches, loungers, umbrellas, pergolas, planters, trees, hedges, fences, and a barbecue.
- Move, resize, rotate, duplicate, lock, delete, and group-drag furniture. Use transform gizmos in 3D or precise property inputs.
- Visual material library with oak/walnut, tile, concrete, fabric, plaster, and paint presets. Apply finishes to rooms, walls, and procedural furniture; imported models retain their embedded materials.
- Red placement highlights in 2D and 3D, with selectable text warnings for overlapping furniture and blocked door approaches. Checks reserve 90 cm on both sides of doors and exclude rugs and wall art.
- Import self-contained GLB/glTF models with license and attribution information. External model dependencies are not supported.

### Outdoor design

Draw rectangular **patios, grass, paths, pools, and terrain** from **Build** or **Furniture → Outdoor**. Edit size, position, rotation, color, and elevation. Terrain patches also support a linear slope.

These are editable design surfaces. Terrain sculpting, excavation, and pool simulation are not implemented.

### Viewing and interaction

- 2D, 3D, and split views; six camera presets and an isometric wall cutaway.
- Day/evening lighting, sun direction, lamp lights, shadows, ceiling visibility, and quality settings.
- Desktop walkthrough with WASD movement and pointer-lock mouse look.
- Mobile touch targets, collapsible library and properties panels, 2D pinch zoom/pan, and 3D zoom/orbit/pan/reset buttons.
- Measurements in meters, centimeters, feet, or inches; user-entered budget estimates.
- Keyboard-accessible object selectors, visible focus outlines, labeled toolbar actions, reduced-motion styles, and focus trapping/restoration in account and sharing dialogs.

### Saving and sharing

- Local autosave, interrupted-session recovery, revision checks, and up to 100 undo steps.
- Export JSON backups, PDF floor plans with wall/opening dimensions and custom measurements, high-resolution PNG/JPEG views (up to 3840 pixels wide), and GLB geometry. Images retain the viewport aspect ratio; image and GLB exports require a visible 3D view.
- Optional Supabase sign-in, cloud save/load, historical versions, and revocable read-only sharing links.

## Editor guide

| Task                   | How                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Draw a room or wall    | Open **Build**, choose a tool, then tap a start and end point. For a polygon, tap its corners and return to the first point. |
| Resize a wall          | Select it and drag the endpoint or height arrows. Geometry updates live; release to commit.                                  |
| Add a door or window   | Choose **Add door** or **Add window**, then tap a wall.                                                                      |
| Edit an opening        | Drag it along its wall in 2D, or use the Move, Width, and Height handles in either view. Choose its style in Properties.     |
| Add furniture          | Click a catalog card or drag it into the 2D plan. Select it to adjust dimensions and materials.                              |
| Add an outdoor surface | Choose **Draw patio/grass/path/pool/terrain**, then tap two opposite corners.                                                |
| Use alignment guides   | Enable snapping in the bottom toolbar; guides appear during supported 2D placement interactions.                             |
| Make space on mobile   | Collapse Properties using its heading button; the object stays selected.                                                     |
| Navigate 3D            | Orbit, pan, and zoom with gestures or the camera buttons. Use **Reset camera** to return to the overview.                    |

| Shortcut                       | Action                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Ctrl/Cmd+Z                     | Undo                                                                                                 |
| Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y | Redo                                                                                                 |
| Ctrl/Cmd+D                     | Duplicate selected furniture                                                                         |
| Ctrl/Cmd+S                     | Save                                                                                                 |
| Delete                         | Delete selection; locked furniture is preserved                                                      |
| Escape                         | Cancel drawing or a handle preview; release selection or exit presentation/walkthrough as applicable |

Local projects are stored in the current browser under `spacesketch-projects-v1`. Export JSON backups before clearing browser data. Local projects do not automatically appear in another browser or device.

## Repository structure

```text
SpaceSketch/
├── frontend/
│   ├── app/                    Next.js routes and styles
│   ├── components/             Editor, 2D/3D views, controls, and previews
│   ├── lib/                    Models, geometry, placement, and persistence
│   ├── stores/editor.ts        Project state, live previews, and undo history
│   ├── public/                 Logo and other static assets
│   ├── tests/                  Unit and browser tests
│   ├── .env.example            Public Supabase configuration template
│   └── package.json            Application dependencies and scripts
├── backend/
│   └── supabase/migrations/    Database schema, functions, and access policies
├── package.json                Root command shortcuts
└── README.md
```

The frontend uses Next.js, React, TypeScript, React Three Fiber/Three.js, React Konva, Zustand, and Zod. One project document drives both views; temporary drag previews are kept out of saved data. Coordinates use X/Z for the floor plane and Y for height, with dimensions stored in meters.

The backend runs on Supabase; there is no separate Node.js backend server to start. The browser client stays in `frontend/lib/supabase.ts`.

See the [frontend README](frontend/README.md) and [backend README](backend/README.md) for folder-specific setup.

## Optional Supabase setup

1. Create a Supabase project and run [001_initial.sql](backend/supabase/migrations/001_initial.sql) in its SQL editor.
2. Enable email/password authentication.
3. Copy `frontend/.env.example` to `frontend/.env.local` and fill in the public credentials:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   ```

4. Set the Auth Site URL to your frontend URL. Allow `http://localhost:3000/reset-password` and the production `/reset-password` URL for password recovery.
5. Restart the frontend, open the account menu, and sign in. Save to sync a project, use **Load cloud projects** on another device, and use **Share** to manage links and versions.

Only public browser credentials belong in these variables. Do not expose a service-role key.

The backend uses row-level security and database functions for ownership checks, optimistic revision checks, version history, and shared reads. Anyone with an active sharing token can read that project; revoking the link removes its token.

**Live Supabase integration has not been verified against a configured project in this workspace.** Before deployment, verify authentication, owner isolation, concurrent saves, version restoration, sharing/revocation, and storage permissions. The SQL validation does not duplicate every client-side geometry constraint.

## Commands and verification

Run these from the repository root:

| Command                | Purpose                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run setup`        | Install frontend dependencies from the lockfile                                                                                       |
| `npm run dev`          | Start the development server                                                                                                          |
| `npm run typecheck`    | Check TypeScript                                                                                                                      |
| `npm run lint`         | Run ESLint                                                                                                                            |
| `npm run format`       | Format frontend, backend scripts, and documentation with Prettier                                                                     |
| `npm run format:check` | Check formatting without changing files                                                                                               |
| `npm test`             | Run unit tests                                                                                                                        |
| `npm run test:e2e`     | Run Playwright browser tests                                                                                                          |
| `npm run test:cloud`   | Verify a configured Supabase backend with two dedicated test accounts; see [backend setup](backend/README.md#live-cloud-verification) |
| `npm run build`        | Build for production                                                                                                                  |
| `npm start`            | Serve the production build; run build first                                                                                           |

The last verified feature update passed the production build, lint, **44 unit tests**, and **11 browser tests**. Coverage includes geometry, snapping, schema compatibility, live previews and undo, opening edits, outdoor surfaces, persistence, imports/exports, catalog thumbnails, and mobile controls.

Playwright is configured to use installed **Google Chrome**. It starts a local development server when needed and can reuse an existing one. Screenshots and failure artifacts are written to `frontend/test-results/`, which Git ignores.

Dependency audit results change over time. To inspect the current frontend dependencies, run:

```sh
npm --prefix frontend audit
npm --prefix frontend audit --omit=dev
```

## Deployment

For a Vercel deployment, use these project settings:

| Setting         | Value           |
| --------------- | --------------- |
| Root directory  | `frontend`      |
| Framework       | Next.js         |
| Install command | `npm ci`        |
| Build command   | `npm run build` |

Use a Node.js version compatible with the local setup. Configure the two public Supabase variables if cloud features are needed, apply the migration, and add the deployed URL to the Supabase authentication settings. Without Supabase configuration, the app runs in local demo mode.

## Current limitations

- No multiple floors, full constraint solver, viewport rulers, or automatic placement suggestions.
- Standalone wall loops do not automatically create floors. Use the polygon room tool; overlapping room floors are not merged automatically.
- Collision warnings do not prevent every overlap. Walkthrough uses simplified collision geometry and is intended for desktop use.
- Outdoor surfaces are rectangular; terrain supports a linear slope rather than freeform sculpting. Walkthrough does not simulate terrain or water physics.
- Imported models must be self-contained and no larger than 2.9 MB. Embedded assets count toward the 5 MB project limit and browser storage quota.
- Cloud asset uploads, automatic retry queues, and complete server-side geometry validation need further work. Cloud features require live integration testing.
- No real-time collaboration, AI design service, supplier pricing, or photorealistic rendering. Budget totals use prices entered by the user.
- Broader accessibility, browser, and device testing is still needed.

Built-in furniture geometry and procedural textures are authored in the project. The SpaceSketch logo is supplied by the project owner; imported models retain user-provided license and attribution information.
