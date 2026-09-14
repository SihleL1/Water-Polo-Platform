import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

async function authorize(request: Request, supabase: ReturnType<typeof createServerSupabase>) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const isDevBypass = process.env.NODE_ENV !== 'production' && token === 'dev-token' && process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === '1';
  if (!token && !isDevBypass) return 'Missing authorization';
  if (!isDevBypass) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return 'Invalid token';
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const authorizationError = await authorize(request, supabase);
    if (authorizationError) return NextResponse.json({ error: authorizationError }, { status: 401 });

    const body = await request.json();
    const tournamentId = typeof body?.tournament_id === 'string' ? body.tournament_id.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!tournamentId || !name) return NextResponse.json({ error: 'Tournament ID and pool/group name are required.' }, { status: 400 });

    const { data: tournament, error: tournamentError } = await supabase.from('tournaments').select('id').eq('id', tournamentId).maybeSingle();
    if (tournamentError) return NextResponse.json({ error: tournamentError.message }, { status: 500 });
    if (!tournament) return NextResponse.json({ error: 'Tournament was not found.' }, { status: 404 });

    const { data: existing, error: existingError } = await supabase.from('pool_groups').select('id,name').eq('tournament_id', tournamentId).ilike('name', name).maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (existing) return NextResponse.json({ error: `Pool/group "${name}" already exists in this tournament.` }, { status: 409 });

    const { data, error } = await supabase.from('pool_groups').insert({ tournament_id: tournamentId, name }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Pool creation API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create pool/group.' }, { status: 500 });
  }
}

