import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getRequiredEnv(name: string): string {
const value = process.env[name];

if (!value) {
throw new Error(
`${name} is missing. Add it to your .env.local file.`
);
}

return value;
}

export function createServerSupabase(): SupabaseClient {
const supabaseUrl = getRequiredEnv(
'NEXT_PUBLIC_SUPABASE_URL'
);

const serviceRoleKey = getRequiredEnv(
'SUPABASE_SERVICE_ROLE_KEY'
);

return createClient(
supabaseUrl,
serviceRoleKey,
{
auth: {
persistSession: false,
autoRefreshToken: false,
},
}
);
}
