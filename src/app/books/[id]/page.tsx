import BookReaderClient from './BookReaderClient';
import { SAMPLE_BOOKS } from '@/data/books';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateStaticParams() {
  return SAMPLE_BOOKS.map((book) => ({
    id: book.id,
  }));
}

export default async function BookReaderPage({ params }: PageProps) {
  const { id } = await params;
  return <BookReaderClient bookId={id} />;
}
