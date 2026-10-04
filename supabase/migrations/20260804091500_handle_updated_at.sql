-- Generic handle_updated_at trigger — required for most tables' updated_at set_timestamp triggers.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
