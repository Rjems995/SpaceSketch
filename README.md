# SpaceSketch

A local-first interior design application built with Next.js App Router, React, TypeScript, React Three Fiber, Three.js, React Konva, and Zustand. A single validated project document drives both the floor plan and the live 3D scene.

## Run locally

Use Node.js 22.12+ (Node 24 was used for development).

```sh
npm run setup
npm run dev
```

These commands run from the repository root. `setup` installs the locked dependencies in `frontend/`; the other root scripts forward to that package. You can also run `npm ci` and `npm run dev` directly inside `frontend/`.

Open http://localhost:3000. No credentials are necessary for local demo mode. On Windows PowerShell, use `npm.cmd` if script execution policies block `npm.ps1`. If the npm shim hangs, use `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev`.

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm start
```

Playwright uses installed Google Chrome (`channel: 'chrome'`). Change the channel or install Playwright Chromium if Chrome is unavailable. The test runner starts and stops its own local Next.js server.

## Implemented interactions

- Project dashboard: create, open, rename, duplicate, confirm deletion, search, recent sorting, and geometry-derived previews.
- Seven editable starter presets, including a two-room studio apartment; twenty-eight procedural furniture types with original geometry and no remote asset dependencies.
- 2D: rectangular and custom polygon rooms, wall segments, connected endpoint editing, room resizing, wall splitting, doors/windows, saved measurement annotations, zoom, pan, adjustable grid snapping, wall endpoint snapping, furniture alignment and wall-edge snapping.
- Rooms support naming, type assignment, hide/show and deletion; walls shared with another room are preserved. Partial shared edges and crossing/T junctions are split into unique segments, attached openings retain their world positions, and split endpoints are inserted into connected floor boundaries. Junctions that would cut an opening are rejected.
- Outdoor collection: garden bench, sun lounger, patio umbrella, pergola, raised planter, tree, hedge, fence, and barbecue; additional indoor ottoman, bedside table, and dining table. Wall properties expose connected endpoint coordinates; door/window properties expose width, height, sill, and position with fit and overlap validation.
- Furniture: click or drag from library into 2D, select, move, resize, rotate, duplicate, lock, delete, multi-select and group drag; precise property inputs update both canvases. Selected 3D objects expose move/rotate/scale gizmos.
- Import self-contained GLB 2.0 or glTF files (up to 2.9 MB), record license/attribution, preserve embedded model data in JSON backups, and normalize model pivots. Models referencing external URLs are rejected.
- 3D: generated floors and walls with actual openings; procedural furniture; orbit/pan/zoom; six camera presets; isometric cutaway; ceiling visibility; daylight/evening, sun direction, lamp lights, shadows, and three quality levels.
- Walkthrough: click to capture the pointer, WASD movement, mouse look, furniture/wall collisions, and passable door openings. Escape releases the pointer; the toolbar exits walkthrough.
- Floor finishes: procedural wood, tile, concrete and carpet textures with scale and rotation. Furniture/walls support color; furniture also supports roughness and metalness.
- Measurements use meters internally, with m/cm/ft/in display. Area uses polygon geometry. Collision warnings use rotated furniture bounds and wall thickness.
- Undo/redo, 900 ms debounced local autosave, tab-local interrupted-session recovery, local revision conflict detection, JSON validation, and import size limits. Individual projects have `/editor/[projectId]` URLs that reopen on refresh.
- Export JSON, vector PDF floor plans, PNG/JPEG views, and GLB design geometry. Image/GLB export requires a visible 3D canvas. GLB restores full wall height and omits viewport rendering helpers.
- Responsive dashboard, collapsible mobile library, mobile selection properties, and 2D pinch zoom/two-finger pan.
- User-entered budget totals; these are estimates with no supplier pricing feed.
- Supabase integration code: email/password sign-in, registration, password reset, logout, cloud save/load, optimistic cloud revisions, retained versions, read-only links, and revocation.

## Editor controls

Choose **Build** to draw. Click two points to create a rectangular room/wall or measure a distance. For custom polygon rooms, click corners and click the first point again to close the boundary. Select a wall to drag endpoints or edit thickness/height; endpoints shared by other walls and room polygons move together. Click a wall with the Door or Window tool to add an opening. Opening overlap and invalid room boundaries are rejected.

Choose **Furniture** to add a piece or import a model. In 2D, drag it to move, use selection handles to resize/rotate, and Shift-click for multiple selection. Edits are made through one store; 3D never maintains a separate geometry copy. In 3D, select an object and choose Move, Rotate, or Scale in the properties panel to control the gizmo. Imported meshes retain source colors with a white default tint; color tint, roughness, and metalness can be edited.

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y | Redo |
| Ctrl/Cmd+D | Duplicate selection |
| Ctrl/Cmd+S | Save |
| Delete | Delete selection (locked furniture is preserved) |
| Escape | Cancel drawing, release selection, exit presentation/walkthrough |

Local projects live in `localStorage` under `spacesketch-projects-v1`. Export JSON backups before clearing browser data. A different browser/profile does not share local projects.

## Supabase setup

1. Create a Supabase project.
2. Run `backend/supabase/migrations/001_initial.sql` in its SQL editor. This creates profiles, projects, versions, assets, shares, a private storage bucket, indexes, RLS policies, and transaction-safe RPCs.
3. Copy `frontend/.env.example` to `frontend/.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the project's public browser credentials. Never put a service-role key into this application.
4. Enable email/password authentication. Set the Site URL to your deployment URL and allow `http://localhost:3000/reset-password` and your production `/reset-password` URL as redirect URLs.
5. Restart Next.js. Open the account button to register/sign in. Save a project to sync it; use **Load cloud projects** on another device.
6. Use **Share** to create a read-only URL, revoke existing links, or load and restore a historical cloud revision.

Cloud writes execute through `save_project`. Its transaction checks the authenticated owner and the exact last observed cloud revision, snapshots the previous data, and retains the latest 50 historical versions. Direct project writes have no insert/update RLS policy. Read/delete policies restrict access to the owner. Public shared reads require an unguessable UUID token through a restricted RPC; revocation deletes that token. Anyone holding a live token can read the project data.

The SQL migration and live authentication/authorization/sharing flows **have not been executed against a real Supabase project in this workspace** because credentials were not supplied. Before production, test two separate users, stale concurrent saves, revoked links, account recovery, and storage access against your configured instance. The SQL payload guard enforces size/collection limits but does not duplicate every Zod geometry constraint server-side.

## Architecture

```text
frontend/
  app/                      Next.js routes, password recovery, shared viewer
  components/               Dashboard, Konva editor, Three.js scene and UI
  stores/editor.ts          Canonical document, selection and edit history
  lib/                      Geometry, topology, models, materials and persistence
  lib/supabase.ts           Browser client for authenticated backend operations
  public/                   Frontend assets
  tests/                    Vitest unit tests and Playwright workflows
  .env.example              Public frontend configuration template
  package.json              Frontend dependencies and commands
backend/
  supabase/migrations/      Database schema, RPCs, RLS and storage policies
  README.md                 Supabase backend configuration
package.json                Convenience scripts that run the frontend package
```

The backend is hosted by Supabase. Its configuration and database code are separated from the frontend; the frontend keeps the client that calls it. See [frontend setup](frontend/README.md) and [backend setup](backend/README.md).

Coordinates use X/Z on the floor plane and Y for height. 2D screen Y maps to world Z. Object dimensions are meters; rotation is stored in degrees, converted at the 3D boundary. Drag/resize interactions commit one document update at the end, producing one history entry. History is limited to 100 edits.

## Verification

The 28 unit tests cover coordinate conversion, wall lengths, concave polygon area, invalid polygons, rotated collisions, snapping, opening references/remapping, shared wall normalization, room resizing/splitting/visibility/deletion, asset URL validation, serialization, undo/redo and saved revision preservation, locked deletion, recovery, and local/cloud merge behavior. Six browser tests exercise drawing an actual room, furniture drag and undo, editing/materials/persistence/JSON, model import and provenance, real PNG/PDF/GLB downloads, direct editor URL reload, live 3D, and the mobile viewport. Browser screenshots are written into ignored `test-results/`.

The initial dependency audit exposed critical advisories in jsPDF and Vitest; these were upgraded to patched versions. Five high-severity development-tool advisories remain in the `eslint-config-next` → `fast-glob` → `micromatch` → `braces` chain. `npm audit --omit=dev` reports zero production dependency vulnerabilities. Do not apply an automatic forced downgrade of the Next.js lint configuration without testing compatibility.

## Deployment to Vercel

1. Push this directory to a Git repository and import it into Vercel.
2. Set **Root Directory** to `frontend`. Select the Next.js preset, Node.js 22 or 24, install command `npm ci`, and build command `npm run build`.
3. Set the two public Supabase variables for the relevant environments if cloud features are desired. Without them, the deployment remains a functional browser-local demo.
4. Apply the database migration and add Vercel's production URL to Supabase Auth's Site URL/redirect allowlist.
5. Deploy, then verify a fresh account, owner isolation, cloud reload, export, shared viewing, and revocation.

No hosted deployment was created as part of local development.

## Scope and remaining limitations

This is a functional portfolio application, **not a fully completed production CAD platform**. The original brief is broader than the current implementation:

- Standalone wall loops do not automatically become floor polygons; use the custom polygon room tool. Shared boundaries are normalized, but overlapping room floors are not automatically merged and should be avoided when drawing.
- Multiple floors, viewport rulers, a full constraint solver, spacing guides, and automatic placement suggestions remain unimplemented. Collision warnings do not universally prevent overlaps.
- Walkthrough has adjustable speed, a default eye height of 1.65 m, and 2D collision proxies. It is intended for desktop pointer-lock input.
- Licensed remote model catalogs, separate-file glTF dependencies, user texture upload, wallpaper/brick, spotlights, and postprocessing AO are not implemented. Embedded imported models count toward the 5 MB project cap and browser storage quota. Source colors are retained for imported models.
- The studio preset has living and bedroom spaces; it is not a fully furnished multi-room house. Furniture categories are a starter subset of the requested catalog.
- The mobile editor supports basic interaction, but precision drawing is best on desktop. Accessibility and cross-browser/device coverage need a broader audit.
- Cloud rename and deletion are wired to authenticated operations. Protected account-only route UX, separate cloud asset uploads, automatic network retry queues, and complete server-side geometry validation need hardening. All cloud operations still require verification against a configured Supabase instance. Loading newer cloud data retains a local recovery copy before replacing a local project.
- No AI design service, real-time collaboration, commercial pricing, photorealistic rendering, or automated deployment is included. TanStack Query handles version queries and React Hook Form validates password recovery. The optional postprocessing dependency is installed but no AO pass is enabled.

All furniture and procedural textures were authored for this application. No third-party furniture meshes or downloaded image assets are bundled.
