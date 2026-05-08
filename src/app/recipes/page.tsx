'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clipboard, Clock, Loader2, Plus, Search, Share2, Users } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getSupabasePublicConfig } from '@/lib/supabaseConfig';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

type RecipeSummary = {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  cooking_time_minutes: number;
  serving_size: number;
  image_url: string | null;
  created_at: string;
};

const CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Desserts',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
] as const;

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const BUCKET = 'recipe-images';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function encodeStoragePath(path: string) {
  return path
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/');
}

function safeFileName(name: string) {
  const n = String(name || 'image').trim();
  const cleaned = n.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-');
  return cleaned.slice(0, 80) || 'image';
}

function containsNonHalalTerms(text: string) {
  const hay = text.toLowerCase();
  const blocked = [
    'pork',
    'bacon',
    'ham',
    'prosciutto',
    'pepperoni',
    'lard',
    'gelatin',
    'wine',
    'beer',
    'rum',
    'vodka',
    'whiskey',
    'bourbon',
    'brandy',
    'champagne',
    'cognac',
  ];
  return blocked.some((t) => hay.includes(t));
}

async function uploadToSupabaseStorageWithProgress(args: {
  accessToken: string;
  path: string;
  file: File;
  onProgress: (pct: number) => void;
}) {
  const { url: supabaseUrl, publicKey: supabasePublicKey } = getSupabasePublicConfig();
  if (!supabaseUrl || !supabasePublicKey) throw new Error('Supabase is not configured.');

  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeStoragePath(args.path)}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Authorization', `Bearer ${args.accessToken}`);
    xhr.setRequestHeader('apikey', supabasePublicKey);
    xhr.setRequestHeader('Content-Type', args.file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      args.onProgress(pct);
    };
    xhr.onerror = () => reject(new Error('Image upload failed.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Image upload failed (HTTP ${xhr.status}).`));
    };
    xhr.send(args.file);
  });

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${encodeStoragePath(args.path)}`;
  return publicUrl;
}

export default function RecipesPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);

  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORIES)[number] | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Dinner');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [cookingTimeMinutes, setCookingTimeMinutes] = useState('30');
  const [servingSize, setServingSize] = useState('4');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [halalConfirmed, setHalalConfirmed] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const load = async () => {
      setLoading(true);
      setError(null);
      setWarning(null);
      setSuccessId(null);

      try {
        const params = new URLSearchParams();
        if (categoryFilter !== 'All') params.set('category', categoryFilter);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        const res = await fetch(`/api/recipes?${params.toString()}`, { signal: controller.signal });
        const json = (await res.json()) as { recipes?: RecipeSummary[]; error?: string; warning?: string };
        if (!res.ok) throw new Error(json.error || 'Failed to load recipes.');
        setWarning(typeof json.warning === 'string' && json.warning.trim() ? json.warning.trim() : null);
        setRecipes(Array.isArray(json.recipes) ? json.recipes : []);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to load recipes.');
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const grouped = useMemo(() => {
    const map = new Map<string, RecipeSummary[]>();
    CATEGORIES.forEach((c) => map.set(c, []));
    recipes.forEach((r) => {
      const list = map.get(r.category) || [];
      list.push(r);
      map.set(r.category, list);
    });
    return map;
  }, [recipes]);

  function validate() {
    const next: Record<string, string> = {};
    const n = name.trim();
    if (!n) next.name = 'Recipe name is required.';
    if (n.length > 120) next.name = 'Recipe name is too long.';
    const t = cookingTimeMinutes.trim();
    const s = servingSize.trim();
    const tNum = Number(t);
    const sNum = Number(s);
    if (!Number.isFinite(tNum) || tNum <= 0) next.cookingTimeMinutes = 'Cooking time must be a positive number.';
    if (!Number.isFinite(sNum) || sNum <= 0) next.servingSize = 'Serving size must be a positive number.';
    if (!ingredients.trim()) next.ingredients = 'Ingredients are required.';
    if (!instructions.trim()) next.instructions = 'Instructions are required.';
    if (!halalConfirmed) next.halalConfirmed = 'Please confirm the recipe is halal.';
    const combined = `${n}\n${ingredients}\n${instructions}`;
    if (combined.trim() && containsNonHalalTerms(combined)) {
      next.nonHalal = 'Recipe appears to include non-halal ingredients. Please review and remove anything that is not halal.';
    }
    if (imageFile) {
      if (imageFile.size > MAX_IMAGE_BYTES) next.image = 'Image is too large (max 6MB).';
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(imageFile.type)) next.image = 'Supported formats: PNG, JPG, WEBP, GIF.';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessId(null);
    setUploadPct(0);

    if (!validate()) return;

    if (!supabase) {
      setError('Supabase is not configured. Recipes cannot be submitted.');
      return;
    }
    if (!user) {
      setError('Please sign in to submit a recipe.');
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) {
        throw new Error('Could not get an upload token. Please sign in again.');
      }

      const recipeId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      if (imageFile) {
        const fileName = safeFileName(imageFile.name);
        imagePath = `public/${user.id}/${recipeId}-${fileName}`;
        imageUrl = await uploadToSupabaseStorageWithProgress({
          accessToken: session.access_token,
          path: imagePath,
          file: imageFile,
          onProgress: (pct) => setUploadPct(pct),
        });
      }

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recipeId,
          title: name.trim(),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
          cookingTimeMinutes: Number(cookingTimeMinutes),
          servingSize: Number(servingSize),
          difficulty,
          category,
          imageUrl,
          imagePath,
          halalConfirmed,
        }),
      });

      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error || 'Recipe submission failed.');

      setSuccessId(json.id || recipeId);
      setName('');
      setIngredients('');
      setInstructions('');
      setHalalConfirmed(false);
      setImageFile(null);
      setUploadPct(0);
      setFieldErrors({});

      router.refresh();
      const params = new URLSearchParams();
      if (categoryFilter !== 'All') params.set('category', categoryFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      const listRes = await fetch(`/api/recipes?${params.toString()}`);
      const listJson = (await listRes.json()) as { recipes?: RecipeSummary[] };
      if (listRes.ok && Array.isArray(listJson.recipes)) setRecipes(listJson.recipes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recipe submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">Halal Recipes</h1>
            <p className="text-slate-600 max-w-2xl text-sm sm:text-base">
              Browse recipes by category, or add your own halal recipe with an optional image and shareable link.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes…"
                className="w-full sm:w-72 pl-10 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full sm:w-48 px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {warning && !error && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {warning}
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                    <div className="h-4 w-40 bg-slate-200 rounded mb-3" />
                    <div className="h-3 w-72 bg-slate-200 rounded mb-2" />
                    <div className="h-3 w-56 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {CATEGORIES.map((cat) => {
                  const list = grouped.get(cat) || [];
                  if (categoryFilter !== 'All' && cat !== categoryFilter) return null;
                  if (list.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">{cat}</h2>
                        <div className="text-xs text-slate-500">{list.length} recipe{list.length === 1 ? '' : 's'}</div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {list.map((r) => (
                          <Link
                            key={r.id}
                            href={`/recipes/${encodeURIComponent(r.id)}`}
                            className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                          >
                            <div className="flex">
                              {r.image_url ? (
                                <div className="w-28 h-24 bg-slate-100 flex items-center justify-center overflow-hidden">
                                  <Image
                                    src={r.image_url}
                                    alt={r.title}
                                    width={112}
                                    height={96}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                  />
                                </div>
                              ) : null}
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                                    {r.title}
                                  </div>
                                  <Share2 className="h-4 w-4 text-slate-300 group-hover:text-emerald-600" />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <Clock className="h-3 w-3" />
                                    {r.cooking_time_minutes} min
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <Users className="h-3 w-3" />
                                    {r.serving_size}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <Clipboard className="h-3 w-3" />
                                    {r.difficulty}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {recipes.length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                    <div className="text-slate-900 font-semibold mb-2">No recipes yet</div>
                    <div className="text-sm text-slate-600">Be the first to add a halal recipe.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">Add a Recipe</h2>
            </div>

            {!user && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4">
                Sign in to submit a recipe.{' '}
                <Link className="font-semibold underline" href="/auth?redirect=/recipes">
                  Go to sign in
                </Link>
                .
              </div>
            )}

            {successId && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 mb-4">
                Recipe saved.{' '}
                <Link className="font-semibold underline" href={`/recipes/${encodeURIComponent(successId)}`}>
                  View recipe
                </Link>
                .
              </div>
            )}

            {fieldErrors.nonHalal && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
                {fieldErrors.nonHalal}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipe name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Chicken Biryani"
                />
                {fieldErrors.name && <div className="mt-1 text-xs text-red-600">{fieldErrors.name}</div>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cooking time (min)</label>
                  <input
                    value={cookingTimeMinutes}
                    onChange={(e) => setCookingTimeMinutes(e.target.value)}
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldErrors.cookingTimeMinutes && (
                    <div className="mt-1 text-xs text-red-600">{fieldErrors.cookingTimeMinutes}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Serving size</label>
                  <input
                    value={servingSize}
                    onChange={(e) => setServingSize(e.target.value)}
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldErrors.servingSize && <div className="mt-1 text-xs text-red-600">{fieldErrors.servingSize}</div>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ingredients</label>
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={'e.g.\n- 2 cups basmati rice\n- 500g chicken\n- 1 onion, sliced'}
                />
                {fieldErrors.ingredients && <div className="mt-1 text-xs text-red-600">{fieldErrors.ingredients}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={'Step 1…\nStep 2…'}
                />
                {fieldErrors.instructions && <div className="mt-1 text-xs text-red-600">{fieldErrors.instructions}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipe photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setImageFile(f);
                    setUploadPct(0);
                    e.currentTarget.value = '';
                  }}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {fieldErrors.image && <div className="mt-1 text-xs text-red-600">{fieldErrors.image}</div>}
                {imagePreviewUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <Image
                      src={imagePreviewUrl}
                      alt="Recipe preview"
                      width={640}
                      height={320}
                      className="w-full h-40 object-cover"
                      unoptimized
                    />
                  </div>
                )}
                {submitting && uploadPct > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Uploading image…</span>
                      <span>{uploadPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-2 bg-emerald-600" style={{ width: `${uploadPct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={halalConfirmed}
                    onChange={(e) => setHalalConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    I confirm this recipe uses halal ingredients and contains no pork or any non-halal ingredients.
                  </span>
                </label>
                {fieldErrors.halalConfirmed && <div className="mt-1 text-xs text-red-600">{fieldErrors.halalConfirmed}</div>}
              </div>

              <button
                type="submit"
                disabled={submitting || !user}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold transition-colors"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {submitting ? 'Submitting…' : 'Submit recipe'}
              </button>

              <div className="text-xs text-slate-500">
                Sharing uses unique links per recipe. For social previews, make the Supabase bucket{' '}
                <span className="font-semibold text-slate-700">{BUCKET}</span> publicly readable.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
