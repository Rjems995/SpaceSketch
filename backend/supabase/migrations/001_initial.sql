-- Run once in the Supabase SQL editor. No service-role key is used by the app.
create table public.profiles (id uuid primary key references auth.users on delete cascade, display_name text, avatar_url text, created_at timestamptz not null default now());
create table public.projects (id uuid primary key, user_id uuid not null references auth.users on delete cascade, name text not null check(length(name) between 1 and 100), description text, thumbnail_url text, project_data jsonb not null check(octet_length(project_data::text)<5000000), schema_version integer not null default 1 check(schema_version=1), revision integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index projects_owner_updated on public.projects(user_id,updated_at desc);
create table public.project_versions (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects on delete cascade, revision integer not null, snapshot_data jsonb not null, created_at timestamptz not null default now(), unique(project_id,revision));
create table public.assets (id uuid primary key default gen_random_uuid(), name text not null, category text not null, model_url text, thumbnail_url text, dimensions jsonb not null, license text not null, attribution text not null);
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.assets enable row level security;
create policy own_profile on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy read_own_projects on public.projects for select to authenticated using(user_id=auth.uid());
create policy delete_own_projects on public.projects for delete to authenticated using(user_id=auth.uid());
create policy read_own_versions on public.project_versions for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
create policy read_assets on public.assets for select using(true);
-- Writes go through this transaction so ownership, optimistic revision checking,
-- and version snapshots cannot be bypassed by direct browser writes.
create or replace function public.save_project(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner_id uuid:=auth.uid(); existing public.projects; expected_revision integer:=coalesce((payload->>'cloudRevision')::integer,0); target_id uuid:=(payload->>'id')::uuid; next_revision integer;
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 if payload is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>5000000 or (payload->>'schemaVersion') is distinct from '1' or jsonb_typeof(payload->'walls') is distinct from 'array' or jsonb_typeof(payload->'rooms') is distinct from 'array' or jsonb_typeof(payload->'furniture') is distinct from 'array' or jsonb_typeof(payload->'openings') is distinct from 'array' then raise exception 'Invalid project payload'; end if;
 if target_id is null or length(coalesce(payload->>'name','')) not between 1 and 100 or jsonb_array_length(payload->'walls')>1000 or jsonb_array_length(payload->'rooms')>100 or jsonb_array_length(payload->'openings')>500 or jsonb_array_length(payload->'furniture')>1000 then raise exception 'Project limit exceeded'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_id::text,0));
 select * into existing from public.projects where id=target_id for update;
 if found then
  if existing.user_id<>owner_id then raise exception 'Not authorized'; end if;
  if expected_revision<>existing.revision then raise exception 'Cloud version is newer. Reload cloud projects before saving.'; end if;
  next_revision:=existing.revision+1;
  payload:=jsonb_set(payload,'{cloudRevision}',to_jsonb(next_revision));
  insert into public.project_versions(project_id,revision,snapshot_data) values(existing.id,existing.revision,existing.project_data);
  update public.projects set name=payload->>'name',project_data=payload,revision=next_revision,updated_at=now() where id=target_id;
 else
  if expected_revision<>0 then raise exception 'Cloud project no longer exists'; end if;
  payload:=jsonb_set(payload,'{cloudRevision}','1');
  insert into public.projects(id,user_id,name,project_data,revision) values(target_id,owner_id,payload->>'name',payload,1);
 end if;
 delete from public.project_versions where id in(select id from public.project_versions where project_id=target_id order by revision desc offset 50);
 return payload;
end $$;
revoke all on function public.save_project(jsonb) from public;
grant execute on function public.save_project(jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('project-assets','project-assets',false,10000000,array['image/png','image/jpeg','model/gltf-binary']) on conflict do nothing;
create policy own_asset_read on storage.objects for select to authenticated using(bucket_id='project-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy own_asset_write on storage.objects for insert to authenticated with check(bucket_id='project-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy own_asset_delete on storage.objects for delete to authenticated using(bucket_id='project-assets' and (storage.foldername(name))[1]=auth.uid()::text);

create table public.project_shares(token uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects on delete cascade,created_at timestamptz not null default now());
alter table public.project_shares enable row level security;
create policy manage_own_shares on public.project_shares for all to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
create function public.view_shared_project(share_token uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$ select p.project_data from public.projects p join public.project_shares s on s.project_id=p.id where s.token=share_token $$;
revoke all on function public.view_shared_project(uuid) from public;
grant execute on function public.view_shared_project(uuid) to anon,authenticated;
