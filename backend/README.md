# SpaceSketch backend

SpaceSketch uses Supabase for PostgreSQL, authentication, storage, and database RPCs. This folder owns the backend schema, access policies, and setup instructions.

```text
backend/
  supabase/
    migrations/
      001_initial.sql
```

## Configure the backend

1. Create a Supabase project.
2. Run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) once in its SQL editor. It creates profiles, projects, project versions, assets, sharing tokens, a private storage bucket, RLS policies, and the save/shared-read functions.
3. Enable email/password authentication.
4. Set Auth's Site URL to the deployed frontend URL. Allow `http://localhost:3000/reset-password` and the production `/reset-password` URL for password recovery.
5. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local`, then restart the frontend. Only public browser credentials belong there; do not expose a service-role key.

Supabase runs the backend services; this folder does not need a separate Node.js server or `npm install`. The browser client in `frontend/lib/supabase.ts` calls those services under the authenticated user's RLS permissions.

## Backend behavior

- `save_project` checks ownership and the expected cloud revision in a transaction, records a historical snapshot, and retains the last 50 versions.
- Project and version reads are restricted to their owner through RLS.
- Project deletion is restricted to its owner.
- Read-only links resolve through `view_shared_project`. Deleting a sharing token revokes the link.
- Storage policies restrict objects to the authenticated user's path in the private bucket.

## Live cloud verification

Apply the migration and configure `frontend/.env.local` first. Create two distinct, confirmed test accounts in that Supabase project, then copy [`.env.test.example`](.env.test.example) to `backend/.env.test.local` and fill in their credentials. This local file is ignored by Git; do not use service-role credentials.

From the repository root, run:

```sh
npm run test:cloud
```

The verifier uses the public key and independent authenticated clients to test:

- Owner save/load through two independent sessions, representing separate devices.
- Cross-account and anonymous read/write/delete restrictions.
- Direct-update protection, stale revisions, and concurrent saves.
- Owner-only history and restoring a snapshot as a new revision.
- Public read-only sharing, latest-version visibility, and link revocation.

It creates a new, randomly identified test project and deletes only that project's data afterward. It does not create users, change the schema, or modify existing projects. A failed cleanup prints the test project ID for manual removal. Missing configuration exits with code 2; failed checks exit with code 1. A passing run exits with code 0.

This verifies the live backend API and session isolation. It does not replace browser/device testing of account switching, offline interruptions, or storage-bucket policies. Browser-local projects remain in the same browser storage regardless of the signed-in account; backend access policies are verified separately.

Live backend checks still require a configured Supabase project: verify separate-user isolation, stale saves, authentication recovery, sharing/revocation, and storage permissions before production use. See the [main README](../README.md) for the remaining validation limitations.
