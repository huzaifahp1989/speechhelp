import BookReaderClient from './BookReaderClient';
import { SAMPLE_BOOKS } from '@/data/books';

type PageProps = {
  params: {
    id: string;
  };
};

export async function generateStaticParams() {
  return SAMPLE_BOOKS.map((book) => ({
    id: book.id,
  }));
}

export default function BookReaderPage({ params }: PageProps) {
  return <BookReaderClient bookId={params.id} />;
}
