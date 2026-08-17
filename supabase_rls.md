Supabase RLS examples

1. Enable RLS on a table (e.g., `tournaments`)

```sql
-- enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- allow authenticated users to read
CREATE POLICY "allow_authenticated_read" ON public.tournaments
  FOR SELECT USING (auth.role() = 'authenticated');

-- allow authenticated users to insert (adjust as needed)
CREATE POLICY "allow_authenticated_insert" ON public.tournaments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

2. Require an admin claim for writes

If you add a custom JWT claim `is_admin: true` for admin users, restrict writes:

```sql
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_only_write" ON public.tournaments
  FOR ALL USING ((auth.jwt() ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() ->> 'is_admin')::boolean = true);
```

3. Recommended deployment pattern

- Keep `anon`/publishable key in the client for public reads only.
- Move all privileged writes to server-side endpoints that use the Service Role key.
- Use RLS to ensure requests from client-side are constrained.

Apply these in the Supabase SQL editor or via psql.
