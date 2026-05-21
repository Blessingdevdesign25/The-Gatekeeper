import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getSession();
    session.destroy();
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
