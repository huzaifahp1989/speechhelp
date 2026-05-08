import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

const CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Desserts',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
] as const;

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(String(value || '').trim());
  return Number.isFinite(n) ? n : NaN;
}

function isAllowedCategory(category: string) {
  return (CATEGORIES as readonly string[]).includes(category);
}

function isAllowedDifficulty(difficulty: string): difficulty is Difficulty {
  return difficulty === 'Easy' || difficulty === 'Medium' || difficulty === 'Hard';
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

function short(text: string, max = 220) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function isNonFatalLoadError(error: unknown) {
  const message = typeof (error as { message?: unknown })?.message === 'string' ? (error as { message: string }).message : '';
  const code = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : '';
  const hay = `${code} ${message}`.toLowerCase();
  return (
    hay.includes('permission denied') ||
    hay.includes('rls') ||
    hay.includes('row level security') ||
    hay.includes('does not exist') ||
    hay.includes('relation') ||
    hay.includes('42p01') ||
    hay.includes('schema cache')
  );
}

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { recipes: [], warning: 'Recipes database is not configured yet.' },
      { status: 200 }
    );
  }

  const category = safeString(request.nextUrl.searchParams.get('category'));
  const q = safeString(request.nextUrl.searchParams.get('q'));
  const qSafe = q.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();

  let query = supabase
    .from('recipes')
    .select('id,title,category,difficulty,cooking_time_minutes,serving_size,image_url,created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(200);

  if (category && isAllowedCategory(category)) {
    query = query.eq('category', category);
  }

  if (qSafe) {
    query = query.or(`title.ilike.%${qSafe}%,category.ilike.%${qSafe}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isNonFatalLoadError(error)) {
      return NextResponse.json(
        {
          recipes: [],
          warning: 'Recipes are not available yet. Create the "recipes" table and allow public SELECT for is_public = true.',
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { recipes: [], error: error.message || 'Could not load recipes.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ recipes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to submit a recipe.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const obj = (body ?? {}) as Record<string, unknown>;

  const id = safeString(obj.id);
  const title = safeString(obj.title);
  const ingredients = safeString(obj.ingredients);
  const instructions = safeString(obj.instructions);
  const cookingTimeMinutes = safeNumber(obj.cookingTimeMinutes);
  const servingSize = safeNumber(obj.servingSize);
  const difficulty = safeString(obj.difficulty);
  const category = safeString(obj.category);
  const imageUrl = safeString(obj.imageUrl);
  const imagePath = safeString(obj.imagePath);
  const halalConfirmed = Boolean(obj.halalConfirmed);

  if (!id) return NextResponse.json({ error: 'Missing recipe id.' }, { status: 400 });
  if (!title) return NextResponse.json({ error: 'Recipe name is required.' }, { status: 400 });
  if (title.length > 120) return NextResponse.json({ error: 'Recipe name is too long.' }, { status: 400 });
  if (!ingredients) return NextResponse.json({ error: 'Ingredients are required.' }, { status: 400 });
  if (!instructions) return NextResponse.json({ error: 'Instructions are required.' }, { status: 400 });
  if (!Number.isFinite(cookingTimeMinutes) || cookingTimeMinutes <= 0) {
    return NextResponse.json({ error: 'Cooking time must be a positive number.' }, { status: 400 });
  }
  if (!Number.isFinite(servingSize) || servingSize <= 0) {
    return NextResponse.json({ error: 'Serving size must be a positive number.' }, { status: 400 });
  }
  if (!isAllowedDifficulty(difficulty)) {
    return NextResponse.json({ error: 'Difficulty must be Easy, Medium, or Hard.' }, { status: 400 });
  }
  if (!isAllowedCategory(category)) {
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  }
  if (!halalConfirmed) {
    return NextResponse.json({ error: 'Halal confirmation is required.' }, { status: 400 });
  }

  const combined = `${title}\n${ingredients}\n${instructions}`;
  if (containsNonHalalTerms(combined)) {
    return NextResponse.json({ error: 'Recipe appears to include non-halal ingredients. Please remove them.' }, { status: 400 });
  }

  const insertPayload = {
    id,
    user_id: user.id,
    title,
    ingredients,
    instructions,
    cooking_time_minutes: Math.round(cookingTimeMinutes),
    serving_size: Math.round(servingSize),
    difficulty,
    category,
    image_url: imageUrl || null,
    image_path: imagePath || null,
    halal_confirmed: true,
    is_public: true,
    excerpt: short(instructions, 220),
  };

  const { error } = await supabase.from('recipes').insert(insertPayload);

  if (error) {
    return NextResponse.json(
      { error: 'Recipe could not be saved. Create the "recipes" table and enable insert policies for signed-in users.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ id });
}
