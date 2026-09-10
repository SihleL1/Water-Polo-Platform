import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const {
      data,
      error,
    } = await supabase
      .from('teams')
      .select('id, name, city, province')
      .order('name', {
        ascending: true,
      });

    if (error) {
      console.error(
        'Error loading teams:',
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

    return NextResponse.json(
      {
        data: data ?? [],
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      'Unexpected error loading teams:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load schools.',
      },
      {
        status: 500,
      }
    );
  }
}
