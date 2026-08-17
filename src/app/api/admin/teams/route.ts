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
    const { name, tournament_id, pool_group_id } = body;
    if (!name || !tournament_id)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabase
      .from('teams')
      .insert([{ name, tournament_id, pool_group_id: pool_group_id ?? null }])
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
