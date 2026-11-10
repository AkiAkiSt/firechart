-- Supabase's "enable automatic RLS" option adds a helper function to the
-- public schema, which makes it callable through the API. It is only meant to
-- run as an event trigger, so nobody needs to be able to call it. The function
-- does not exist on a local stack, hence the check.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
