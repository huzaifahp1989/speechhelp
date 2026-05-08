import { NextResponse } from 'next/server';
import { SAMPLE_BOOKS } from '@/data/books';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataFilePath = path.join(process.cwd(), 'src', 'data', 'custom-books.json');
    let customBooks = [];
    
    if (fs.existsSync(dataFilePath)) {
      const fileContent = fs.readFileSync(dataFilePath, 'utf8');
      if (fileContent.trim()) {
        customBooks = JSON.parse(fileContent);
      }
    }

    const allBooks = [...SAMPLE_BOOKS, ...customBooks];
    return NextResponse.json({ books: allBooks });
  } catch (error) {
    console.error('Error fetching books:', error);
    // Fallback to sample books on error
    return NextResponse.json({ books: SAMPLE_BOOKS });
  }
}
