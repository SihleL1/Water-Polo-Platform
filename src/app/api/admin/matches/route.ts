import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '') || null;
    if (!token) return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const {
      tournament_id,
      pool_group_id,
      home_team_id,
      away_team_id,
      home_cap_color,
      away_cap_color,
      status,
    } = body;
    if (!tournament_id || !home_team_id || !away_team_id)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabase
      .from('matches')
      .insert([
        {
          tournament_id,
          pool_group_id: pool_group_id || null,
          home_team_id,
          away_team_id,
          home_cap_color: home_cap_color || null,
          away_cap_color: away_cap_color || null,
          status: status || 'scheduled',
        },
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
