import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '') || null;

    const isDevBypass =
      process.env.NODE_ENV !== 'production' &&
      token === 'dev-token' &&
      process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === '1';

    if (!token && !isDevBypass)
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });

    if (!isDevBypass) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user)
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { tournament_id, name } = body;
    if (!tournament_id || !name)
      return NextResponse.json({ error: 'Missing tournament_id or name' }, { status: 400 });

    const { data, error } = await supabase
      .from('pool_groups')
      .insert([{ tournament_id, name }])
      .select()
      .single();

    if (error) {
      if (isDevBypass) {
        const fake = { id: `dev-${Date.now()}`, tournament_id, name };
        return NextResponse.json({ data: fake });
      }
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
