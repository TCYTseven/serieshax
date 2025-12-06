import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/get-event?id=1
 * Get event details from Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('id') || '1';

    const supabase = createServerSupabaseClient();

    // Get event details from events table
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', parseInt(eventId))
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

