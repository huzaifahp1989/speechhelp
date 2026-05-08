import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Clipboard, Clock, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { getSupabasePublicConfig } from '@/lib/supabaseConfig';
import ShareButtons from './ShareButtons';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

type RecipeRow = {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  cooking_time_minutes: number;
  serving_size: number;
  difficulty: Difficulty;
  category: string;
  image_url: string | null;
  created_at: string;
  excerpt?: string | null;
};

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '';
  if (raw) return raw.startsWith('http') ? raw : `https://${raw}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

function createPublicSupabase() {
  const { url: supabaseUrl, publicKey: supabasePublicKey } = getSupabasePublicConfig();
  if (!supabaseUrl || !supabasePublicKey) return null;
  return createClient(supabaseUrl, supabasePublicKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchRecipe(id: string) {
  const supabase = createPublicSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('recipes')
    .select('id,title,ingredients,instructions,cooking_time_minutes,serving_size,difficulty,category,image_url,created_at,excerpt,is_public')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as RecipeRow;
}

function toLines(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const recipe = await fetchRecipe(id);
  const siteUrl = getSiteUrl();

  if (!recipe) {
    return {
      title: 'Recipe not found',
      robots: { index: false, follow: false },
    };
  }

  const url = `${siteUrl}/recipes/${encodeURIComponent(recipe.id)}`;
  const description =
    String(recipe.excerpt || '').trim() ||
    toLines(recipe.ingredients).slice(0, 4).join(', ').slice(0, 200) ||
    `Halal recipe: ${recipe.title}`;

  return {
    title: `${recipe.title} | Halal Recipes`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: recipe.title,
      description,
      url,
      type: 'article',
      images: recipe.image_url ? [{ url: recipe.image_url, alt: recipe.title }] : [],
    },
    twitter: {
      card: recipe.image_url ? 'summary_large_image' : 'summary',
      title: recipe.title,
      description,
      images: recipe.image_url ? [recipe.image_url] : [],
    },
  };
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await fetchRecipe(id);
  if (!recipe) notFound();

  const ingredients = toLines(recipe.ingredients);
  const steps = toLines(recipe.instructions);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/recipes" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            ← Back to recipes
          </Link>
          <div className="text-xs text-slate-500">{recipe.category}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {recipe.image_url ? (
            <div className="relative w-full h-56 sm:h-80 bg-slate-100">
              <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" unoptimized />
            </div>
          ) : null}

          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">{recipe.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  <Clock className="h-3 w-3" />
                  {recipe.cooking_time_minutes} min
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  <Users className="h-3 w-3" />
                  Serves {recipe.serving_size}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  <Clipboard className="h-3 w-3" />
                  {recipe.difficulty}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">Ingredients</h2>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {ingredients.map((line, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-600 flex-none" />
                        <span className="leading-6">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">Instructions</h2>
                  <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
                    {steps.map((line, idx) => (
                      <li key={idx} className="leading-6">
                        {line}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 h-fit">
                <ShareButtons title={recipe.title} imageUrl={recipe.image_url} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
