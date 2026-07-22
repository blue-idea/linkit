/*
  Remote follow-up (TASK-026): pin search_path on updated_at trigger function.
  Idempotent with 20260718113845 when that migration already sets search_path.
*/

create or replace function public.set_user_bookmarks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
