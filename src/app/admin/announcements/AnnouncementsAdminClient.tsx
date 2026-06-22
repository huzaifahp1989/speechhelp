'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  Save,
  AlertTriangle,
  Calendar,
  Globe,
  ChevronLeft,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { isSiteAdmin } from '@/lib/siteAdmin';
import {
  ANNOUNCEMENT_PAGE_PRESETS,
  formatScheduleLabel,
  isoToLocalInput,
  localInputToIso,
} from '@/lib/announcements';
import type { AnnouncementForm, SiteAnnouncement } from '@/types/announcement';

const EMPTY_FORM: AnnouncementForm = {
  title: '',
  body: '',
  link_url: '',
  link_label: '',
  target_pages: ['*'],
  starts_at: isoToLocalInput(new Date().toISOString()),
  ends_at: '',
  is_active: true,
  show_once: true,
  priority: 0,
};

function toForm(row: SiteAnnouncement): AnnouncementForm {
  return {
    title: row.title,
    body: row.body,
    link_url: row.link_url ?? '',
    link_label: row.link_label ?? '',
    target_pages: row.target_pages?.length ? row.target_pages : ['*'],
    starts_at: isoToLocalInput(row.starts_at),
    ends_at: isoToLocalInput(row.ends_at),
    is_active: row.is_active,
    show_once: row.show_once,
    priority: row.priority,
  };
}

export default function AnnouncementsAdminClient() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<SiteAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [customPaths, setCustomPaths] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('site_announcements')
      .select('*')
      .order('priority', { ascending: false })
      .order('starts_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRows((data as SiteAnnouncement[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function gate() {
      if (!supabase) {
        setError('Supabase is not configured.');
        setAuthChecked(true);
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/auth?redirect=${encodeURIComponent('/admin/announcements')}`);
        return;
      }

      const admin = await isSiteAdmin(supabase, user.id, user.email);
      setIsAdmin(admin);
      setAuthChecked(true);

      if (!admin) {
        setError('You are not authorized. Add your user to the site_admins table in Supabase.');
        setLoading(false);
        return;
      }

      await loadRows();
    }

    gate();
  }, [supabase, router, loadRows]);

  const togglePreset = (id: string) => {
    setForm((prev) => {
      if (id === '*') return { ...prev, target_pages: ['*'] };
      const withoutStar = prev.target_pages.filter((p) => p !== '*');
      const has = withoutStar.includes(id);
      const next = has ? withoutStar.filter((p) => p !== id) : [...withoutStar, id];
      return { ...prev, target_pages: next.length ? next : ['*'] };
    });
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCustomPaths('');
    setError(null);
  };

  const handleEdit = (row: SiteAnnouncement) => {
    setEditingId(row.id);
    const f = toForm(row);
    const presetIds = new Set(ANNOUNCEMENT_PAGE_PRESETS.map((p) => p.id));
    const custom = f.target_pages.filter((p) => !presetIds.has(p));
    setForm(f);
    setCustomPaths(custom.join('\n'));
    setError(null);
  };

  const buildTargetPages = (): string[] => {
    const presetIds = new Set(ANNOUNCEMENT_PAGE_PRESETS.map((p) => p.id));
    const fromPresets = form.target_pages.filter((p) => presetIds.has(p));
    const fromCustom = customPaths
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...new Set([...fromPresets, ...fromCustom])];
    return merged.length ? merged : ['*'];
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and message body are required.');
      return;
    }
    const startsAt = localInputToIso(form.starts_at);
    if (!startsAt) {
      setError('Start date/time is required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      link_url: form.link_url.trim() || null,
      link_label: form.link_label.trim() || null,
      target_pages: buildTargetPages(),
      starts_at: startsAt,
      ends_at: localInputToIso(form.ends_at),
      is_active: form.is_active,
      show_once: form.show_once,
      priority: form.priority,
      updated_at: new Date().toISOString(),
    };

    try {
      if (!supabase) throw new Error('Supabase not configured');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (editingId) {
        const { error: updateError } = await supabase
          .from('site_announcements')
          .update(payload)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('site_announcements').insert({
          ...payload,
          created_by: user?.id ?? null,
        });
        if (insertError) throw insertError;
      }

      handleNew();
      await loadRows();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('Delete this announcement?')) return;
    const { error: deleteError } = await supabase.from('site_announcements').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingId === id) handleNew();
    await loadRows();
  };

  if (!authChecked) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Admin access required</h1>
        <p className="text-slate-600 text-sm mb-6">{error ?? 'Sign in with an admin account.'}</p>
        <Link href="/" className="text-emerald-700 font-semibold hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-600 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to site
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-emerald-600" />
            Announcements
          </h1>
          <p className="text-slate-600 text-sm mt-1 max-w-xl">
            Schedule pop-up announcements for all pages or specific routes. Active announcements
            appear automatically based on start/end times.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            {editingId ? 'Edit announcement' : 'Create announcement'}
          </h2>

          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="Ramadan schedule update"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">Message</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-y"
              placeholder="Write the announcement text users will see…"
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Link URL (optional)</span>
              <input
                value={form.link_url}
                onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="/quran/juz"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Link label</span>
              <input
                value={form.link_label}
                onChange={(e) => setForm((f) => ({ ...f, link_label: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Open Juz reader"
              />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              Show on pages
            </legend>
            <div className="flex flex-wrap gap-2">
              {ANNOUNCEMENT_PAGE_PRESETS.map((preset) => {
                const checked =
                  preset.id === '*'
                    ? form.target_pages.includes('*')
                    : form.target_pages.includes(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => togglePreset(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      checked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <label className="block space-y-1 mt-2">
              <span className="text-[11px] text-slate-500">Custom paths (one per line, e.g. /quran/1)</span>
              <textarea
                value={customPaths}
                onChange={(e) => setCustomPaths(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
                placeholder="/quran/1&#10;/hifz-planner"
              />
            </label>
          </fieldset>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Starts
              </span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Ends (optional)</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-slate-300"
              />
              Active
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_once}
                onChange={(e) => setForm((f) => ({ ...f, show_once: e.target.checked }))}
                className="rounded border-slate-300"
              />
              Show once per user
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">Priority (higher wins)</span>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))}
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0d4f4f] text-white font-bold py-3 text-sm hover:bg-[#146356] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : editingId ? 'Update announcement' : 'Publish announcement'}
          </button>
        </section>

        {/* List */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Scheduled ({rows.length})</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-slate-500 text-sm rounded-xl border border-dashed border-slate-200 p-6 text-center">
              No announcements yet. Create one to show a pop-up on the site.
            </p>
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className={`rounded-xl border p-4 ${
                  row.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{row.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{formatScheduleLabel(row)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pages: {row.target_pages?.join(', ') || '*'}
                      {!row.is_active && ' · inactive'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                      aria-label="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{row.body}</p>
              </article>
            ))
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">First-time setup</p>
            <p>
              Add your Supabase user id to the <code className="font-mono">site_admins</code> table
              to manage announcements. Run the SQL in <code className="font-mono">supabase/schema.sql</code>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
