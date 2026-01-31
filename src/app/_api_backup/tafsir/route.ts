
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tafsirId = searchParams.get('tafsirId');
  const verseKey = searchParams.get('verseKey');

  if (!tafsirId || !verseKey) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const url = `https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}`;
    console.log(`Fetching Tafseer from server: ${url}`);
    
    const res = await fetch(url);
    
    if (!res.ok) {
        if (res.status === 404) {
             return NextResponse.json({ error: 'Tafsir not found' }, { status: 404 });
        }
        throw new Error(`External API failed with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tafseer' }, { status: 500 });
  }
}
