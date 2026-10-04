import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';

const BUCKET = 'quran-recordings';
const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_INLINE_B64_SIZE = 8 * 1024 * 1024; // 8 MB fallback size
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
  'audio/x-m4a',
  'audio/mp4',
  'audio/x-caf',
  'audio/flac',
]);

const AUDIO_EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'mp4',
  'audio/x-caf': 'caf',
  'audio/flac': 'flac',
};

// POST /api/quran-recordings/upload - Upload audio file
export async function POST(request: Request) {
  try {
    // 1) Auth: verify user exists
    const authSupabase = await getSupabaseServerClient();
    if (!authSupabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Parse form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const contentType = String(file.type || '').trim().toLowerCase() || 'audio/mpeg';
    if (!ALLOWED_AUDIO_TYPES.has(contentType)) {
      // Allow empty/uncommon content-types if filename ext is audio (mobile browsers sometimes send generic octet-stream)
      const ext = String(file.name.split('.').pop() || '').toLowerCase();
      const allowedExts = new Set(['mp3', 'wav', 'webm', 'ogg', 'aac', 'm4a', 'mp4', 'caf', 'flac']);
      if (!allowedExts.has(ext)) {
        return NextResponse.json(
          { error: 'Invalid file type. Allowed: MP3, WAV, WEBM, OGG, AAC, M4A, FLAC, CAF' },
          { status: 400 }
        );
      }
    }
    if (file.size > MAX_STORAGE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max size: 50MB' },
        { status: 400 }
      );
    }

    // 3) Build safe storage path: always {user.id}/{timestamp}-{rand}.{ext}
    const extFromFile = String(file.name.split('.').pop() || '').toLowerCase();
    const ext = AUDIO_EXT_BY_MIME[contentType] || (AUDIO_EXT_BY_MIME[`audio/${extFromFile}` as keyof typeof AUDIO_EXT_BY_MIME] as string) || extFromFile || 'webm';
    const timestamp = Date.now();
    const fileName = `${user.id}/${timestamp}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    // 4) Try upload with SERVICE ROLE client (bypasses storage RLS, which sometimes fails to apply via SQL policy runner).
    //    Path validation server-side is mandatory here because service role bypasses RLS.
    let storageMode: 'storage' | 'inline' = 'storage';
    let publicUrl = '';
    let filePath = fileName;
    let finalContentType = contentType;
    let fileSize = file.size;

    const srSupabase = getSupabaseServiceRoleClient();
    let uploadSucceeded = false;
    let uploadErrorReason: string | null = null;

    if (srSupabase) {
      try {
        const bytes = await file.arrayBuffer();
        const fileBuf = Buffer.from(bytes);
        const { data: uploadData, error: uploadError } = await srSupabase.storage
          .from(BUCKET)
          .upload(fileName, fileBuf, {
            contentType: finalContentType,
            upsert: false,
            cacheControl: '31536000',
          });
        if (!uploadError && uploadData) {
          const { data: publicUrlData } = srSupabase.storage.from(BUCKET).getPublicUrl(fileName);
          publicUrl = publicUrlData?.publicUrl || '';
          uploadSucceeded = !!publicUrl;
          if (publicUrl) storageMode = 'storage';
        }
        if (uploadError) {
          uploadErrorReason = String(uploadError.message || (uploadError as { code?: unknown }).code || 'storage_upload_failed');
        }
      } catch (e: any) {
        uploadErrorReason = String(e?.message || (e && e.code ? e.code : 'storage_upload_exception'));
      }
    }

    // 5) FALLBACK: if storage upload failed AND file is small enough, store audio inline in the DB row
    //    (so recordings never get lost on submit — admin can still review via data URL in player until
    //    storage is fixed, or migrate later to bucket).
    if (!uploadSucceeded && file.size <= MAX_INLINE_B64_SIZE) {
      try {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        const dataUrl = `data:${finalContentType};base64,${base64}`;
        publicUrl = dataUrl;
        filePath = `inline:${fileName}`;
        storageMode = 'inline';
        uploadSucceeded = true;
      } catch (e: any) {
        uploadErrorReason = (uploadErrorReason ? `${uploadErrorReason}; ` : '') + 'inline_fallback:' + String(e?.message || 'unknown');
      }
    }

    if (!uploadSucceeded) {
      return NextResponse.json(
        {
          error: 'Failed to upload recording. Please try again in a minute, or use a smaller file (under 8MB for the always-on fallback).',
          storageError: uploadErrorReason || undefined,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      fileName,
      filePath,
      publicUrl,
      fileSize,
      contentType: finalContentType,
      storageMode,
      storageFallback: storageMode === 'inline',
    });
  } catch (error: any) {
    console.error('Unexpected upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(error?.message || '') },
      { status: 500 }
    );
  }
}
