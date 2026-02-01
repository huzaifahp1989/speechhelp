'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { SAMPLE_BOOKS, IslamicBook, BookCategory } from '@/data/books';
import { BookOpen, Plus, Trash2, Pencil, Save, AlertTriangle } from 'lucide-react';

type DbBook = {
  id: string;
  title: string;
  author: string;
  description: string;
  category: BookCategory;
  coverImageUrl: string;
  pdfUrl: string;
};

const EMPTY_BOOK: IslamicBook = {
  id: '',
  title: '',
  author: '',
  description: '',
  category: 'General',
  coverImageUrl: '',
  pdfUrl: '',
};

export default function BooksAdminPage() {
  const supabase = getSupabaseClient();
  const [books, setBooks] = useState<IslamicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IslamicBook>(EMPTY_BOOK);
  const [error, setError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    async function loadBooks() {
      try {
        if (!supabase) {
          setBooks(SAMPLE_BOOKS);
          setLoading(false);
          return;
        }

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 5000)
        );

        const dbPromise = supabase
          .from('books')
          .select('*')
          .order('title', { ascending: true });

        const { data, error: dbError } = await Promise.race([dbPromise, timeoutPromise]) as any;

        if (dbError || !data) {
          setBooks(SAMPLE_BOOKS);
        } else {
          setBooks(data);
        }
      } catch {
        setBooks(SAMPLE_BOOKS);
      } finally {
        setLoading(false);
      }
    }

    loadBooks();
  }, []);

  const handleEdit = (book: IslamicBook) => {
    setEditingId(book.id);
    setForm(book);
    setError(null);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_BOOK);
    setError(null);
  };

  const handleChange = (field: keyof IslamicBook, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'category' ? (value as BookCategory) : value,
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.author || !form.pdfUrl) {
      setError('Title, author, and PDF URL are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!supabase) {
        setError('Supabase is not configured. Changes are stored locally only.');
        if (editingId) {
          setBooks((prev) =>
            prev.map((b) => (b.id === editingId ? { ...form, id: editingId } : b)),
          );
        } else {
          const newId = form.id || crypto.randomUUID();
          setBooks((prev) => [...prev, { ...form, id: newId }]);
          setEditingId(newId);
        }
        return;
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('books')
          .update({
            title: form.title,
            author: form.author,
            description: form.description,
            category: form.category,
            coverImageUrl: form.coverImageUrl,
            pdfUrl: form.pdfUrl,
          })
          .eq('id', editingId);

        if (updateError) {
          setError('Could not update book in database, but local list will be updated.');
        }

        setBooks((prev) =>
          prev.map((b) => (b.id === editingId ? { ...form, id: editingId } : b)),
        );
      } else {
        const newId = form.id || crypto.randomUUID();
        const { error: insertError } = await supabase
          .from('books')
          .insert({
            id: newId,
            title: form.title,
            author: form.author,
            description: form.description,
            category: form.category,
            coverImageUrl: form.coverImageUrl,
            pdfUrl: form.pdfUrl,
          });

        if (insertError) {
          setError('Could not save book in database, but it will appear locally.');
        }

        setBooks((prev) => [...prev, { ...form, id: newId }]);
        setEditingId(newId);
      }
    } catch {
      setError('Unexpected error while saving the book.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Delete this book? This cannot be undone.');
    if (!confirmDelete) return;

    try {
      if (supabase) {
        await supabase.from('books').delete().eq('id', id);
      } else {
        setError('Supabase is not configured. Deleted locally only.');
      }
    } catch {
    } finally {
      setBooks((prev) => prev.filter((b) => b.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_BOOK);
      }
    }
  };

  const handleCoverFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setError(null);

    try {
      if (!supabase) {
        setError('Supabase is not configured. Uploads are disabled.');
        return;
      }

      const bucket = 'book-covers';
      const filePath = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        setError('Could not upload image. Check Supabase storage bucket "book-covers".');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setForm((prev) => ({
          ...prev,
          coverImageUrl: publicUrlData.publicUrl,
        }));
      }
    } catch {
      setError('Unexpected error while uploading the image.');
    } finally {
      setUploadingCover(false);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-600" />
              Manage Islamic Books
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Simple admin panel to add, edit, or remove books from the library.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            <span>
              This page is not access-restricted. Protect the URL before using in production.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Books</h2>
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                New Book
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto custom-scrollbar">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="py-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {book.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {book.author} • {book.category}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {book.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => handleEdit(book)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(book.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {books.length === 0 && (
                  <div className="py-10 text-center text-xs sm:text-sm text-slate-500">
                    No books found. Use "New Book" to add your first book.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {editingId ? 'Edit Book' : 'New Book'}
            </h2>

            {error && (
              <div className="text-xs sm:text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => handleChange('author', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="Aqeedah">Aqeedah</option>
                  <option value="Fiqh">Fiqh</option>
                  <option value="Seerah">Seerah</option>
                  <option value="Tafsir">Tafsir</option>
                  <option value="Hadith">Hadith</option>
                  <option value="Kids">Kids</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={form.coverImageUrl}
                  onChange={(e) => handleChange('coverImageUrl', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="https://..."
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <span>Browse image...</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverFileChange}
                    />
                  </label>
                  {uploadingCover && (
                    <span className="text-[11px] text-emerald-600">
                      Uploading cover...
                    </span>
                  )}
                </div>
                {form.coverImageUrl && (
                  <div className="mt-3">
                    <p className="text-[11px] text-slate-500 mb-1">Preview:</p>
                    <div className="w-full aspect-[3/4] max-w-[140px] border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <img
                        src={form.coverImageUrl}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  PDF URL
                </label>
                <input
                  type="text"
                  value={form.pdfUrl}
                  onChange={(e) => handleChange('pdfUrl', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-400">
                Changes are saved to the Supabase <span className="font-semibold">books</span> table when possible.
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
