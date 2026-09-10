import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabaseClient';

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: {
      tournamentId: string;
    };
  }
) {
  try {
    const tournamentId =
      params.tournamentId;

    if (!tournamentId) {
      return NextResponse.json(
        {
          error:
            'Tournament ID is required.',
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await supabase.rpc(
        'resolve_tournament_fixtures',
        {
          tournament_id_input:
            tournamentId,
        }
      );

    if (error) {
      console.error(
        'Tournament resolver error:',
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      result: data ?? null,
    });
  } catch (error) {
    console.error(
      'Unexpected resolver error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Unexpected tournament resolver error.',
      },
      {
        status: 500,
      }
    );
  }
}