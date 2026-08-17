import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

export async function PATCH(req: Request, { params }: { params: { teamId: string } }) {
  const supabase = createServerSupabase();
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '') || null;
    if (!token) return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { pool_group_id } = body;
    const { data, error } = await supabase
      .from('teams')
      .update({ pool_group_id: pool_group_id || null })
      .eq('id', params.teamId)
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
