import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Series API base URL
const SERIES_API_BASE_URL = process.env.SERIES_API_URL || 'https://series-hackathon-service-202642739529.us-east1.run.app';

/**
 * POST /api/activate-event-agent
 * Activates an event agent by creating a group chat and sending event details via Series API
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get eventId from request body if provided
    let eventId = 1;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.eventId) {
        const idStr = body.eventId.toString().replace('supabase-', '');
        eventId = parseInt(idStr) || 1;
      }
    } catch (error) {
      // Default to event id 1 if parsing fails
      eventId = 1;
    }

    // Use server client for database queries
    const supabase = createServerSupabaseClient();

    // Get event details from events table
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Extract phone numbers from group_list
    const phoneNumbers = extractPhoneNumbersFromGroupList(event.group_list);
    
    if (phoneNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No phone numbers found in event group_list' },
        { status: 400 }
      );
    }

    // Get event name for display_name (use event_name, location_name, or initiator_name as fallback)
    const eventName = event.event_name || event.location_name || event.initiator_name || 'Event';

    // Format event details nicely for SMS
    const eventMessage = formatEventMessage(event);

    // Get Series API credentials
    const seriesApiKey = process.env.SERIES_API_KEY;
    const seriesSenderNumber = process.env.SERIES_SENDER_NUMBER || process.env.NEXT_PUBLIC_SERIES_SENDER_NUMBER;

    if (!seriesApiKey) {
      return NextResponse.json(
        { success: false, error: 'SERIES_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!seriesSenderNumber) {
      return NextResponse.json(
        { success: false, error: 'SERIES_SENDER_NUMBER not configured' },
        { status: 500 }
      );
    }

    // Call Series API to create chat and send message
    const response = await fetch(`${SERIES_API_BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${seriesApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        send_from: seriesSenderNumber,
        chat: {
          display_name: eventName,
          phone_numbers: phoneNumbers,
        },
        message: {
          text: eventMessage,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Series API error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return NextResponse.json(
        { success: false, error: `Series API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Event agent activated and group chat created',
      chatId: result.id || result.chat?.id,
    });
  } catch (error: any) {
    console.error('Error activating event agent:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract phone numbers from group_list JSONB object
 * group_list format: {"Jane":"0987654321","John":"1234567890"}
 */
function extractPhoneNumbersFromGroupList(groupList: any): string[] {
  if (!groupList || typeof groupList !== 'object') {
    return [];
  }

  const phoneNumbers: string[] = [];
  
  // Extract all phone number values from the object
  for (const phoneNumber of Object.values(groupList)) {
    if (typeof phoneNumber === 'string') {
      // Format phone number with +1 prefix if needed
      const formatted = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+1${phoneNumber}`;
      phoneNumbers.push(formatted);
    }
  }

  return phoneNumbers;
}

/**
 * Format event details into a nicely formatted SMS message
 */
function formatEventMessage(event: any): string {
  const lines: string[] = [];
  
  lines.push('🎉 EVENT DETAILS');
  lines.push('');
  
  if (event.initiator_name) {
    lines.push(`👤 Organizer: ${event.initiator_name}`);
  }
  
  if (event.location_name) {
    lines.push(`📍 Location: ${event.location_name}`);
  }
  
  // Format group list if available
  if (event.group_list && typeof event.group_list === 'object') {
    const groupList = event.group_list;
    const participants = Object.keys(groupList);
    if (participants.length > 0) {
      lines.push(`👥 Participants: ${participants.join(', ')}`);
      lines.push(`📊 Total Attendees: ${participants.length}`);
    }
  }
  
  // Add description
  if (event.description) {
    lines.push('');
    lines.push(`📝 ${event.description}`);
  }
  
  // Add notes from polymarket_reddit if available
  if (event.polymarket_reddit) {
    const redditNotes = event.polymarket_reddit?.reddit?.notes;
    const polymarketNotes = event.polymarket_reddit?.polymarket?.notes;
    
    if (redditNotes || polymarketNotes) {
      lines.push('');
      lines.push('📌 Notes:');
      if (redditNotes) {
        lines.push(`   Reddit: ${redditNotes}`);
      }
      if (polymarketNotes) {
        lines.push(`   Polymarket: ${polymarketNotes}`);
      }
    }
  }
  
  // Add vibes if available (can be array or string)
  if (event.vibes) {
    lines.push('');
    lines.push('✨ Vibes:');
    if (Array.isArray(event.vibes)) {
      lines.push(`   ${event.vibes.join(', ')}`);
    } else {
      lines.push(`   ${event.vibes}`);
    }
  }
  
  // Add series reviews if available
  if (event.series_reviews && Array.isArray(event.series_reviews) && event.series_reviews.length > 0) {
    lines.push('');
    lines.push('⭐ Reviews:');
    event.series_reviews.forEach((review: any) => {
      if (review.name && review.review) {
        lines.push(`   ${review.name}: ${review.review}`);
      }
    });
  }
  
  // Add any additional info
  if (event.additional_info) {
    lines.push('');
    lines.push('ℹ️ Additional Info:');
    lines.push(event.additional_info);
  }
  
  lines.push('');
  lines.push('Looking forward to seeing you there! 🎊');
  
  return lines.join('\n');
}

