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

Live backend checks still require a configured Supabase project: verify separate-user isolation, stale saves, authentication recovery, sharing/revocation, and storage permissions before production use. See the [main README](../README.md) for the remaining validation limitations.
