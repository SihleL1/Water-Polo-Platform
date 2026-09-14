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

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabase();
    const authorizationError = await authorize(request, supabase);
    if (authorizationError) return NextResponse.json({ error: authorizationError }, { status: 401 });

    const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Tournament admin GET failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load tournaments.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const authorizationError = await authorize(request, supabase);
    if (authorizationError) return NextResponse.json({ error: authorizationError }, { status: 401 });

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const startDate = typeof body?.startDate === 'string' && body.startDate ? body.startDate : null;
    const endDate = typeof body?.endDate === 'string' && body.endDate ? body.endDate : null;
    const location = typeof body?.location === 'string' && body.location.trim() ? body.location.trim() : null;
    const competitionCategory = body?.competitionCategory === 'BOYS' || body?.competitionCategory === 'GIRLS' || body?.competitionCategory === 'MIXED'
      ? body.competitionCategory
      : 'GIRLS';
    const status = typeof body?.status === 'string' && body.status.trim() ? body.status.trim() : 'active';

    if (!name) return NextResponse.json({ error: 'Tournament name is required.' }, { status: 400 });
    if (startDate && Number.isNaN(new Date(`${startDate}T00:00:00`).getTime())) return NextResponse.json({ error: 'Invalid start date.' }, { status: 400 });
    if (endDate && Number.isNaN(new Date(`${endDate}T00:00:00`).getTime())) return NextResponse.json({ error: 'Invalid end date.' }, { status: 400 });
    if (startDate && endDate && startDate > endDate) return NextResponse.json({ error: 'End date cannot be before start date.' }, { status: 400 });

    const { data, error } = await supabase.from('tournaments').insert({
      name,
      start_date: startDate,
      end_date: endDate,
      location,
      competition_category: competitionCategory,
      status,
    }).select().single();

    if (error) {
      console.error('Tournament creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, tournament: data }, { status: 201 });
  } catch (error) {
    console.error('Tournament creation API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create tournament.' }, { status: 500 });
  }
}
