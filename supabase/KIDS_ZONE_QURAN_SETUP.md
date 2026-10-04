# Kids Zone and Quran Listening setup

Apply `migrations/20261004100000_kids_zone_quran_listening.sql` to the existing Supabase project after the base schema that defines `public.is_site_admin()`.

If an earlier attempt stopped with a missing `kids_achievement_definitions` or `kids_streak_bonus_awards` relation, use the corrected migration in full; the migration creates those tables before applying their policies and triggers and is safe to rerun after a partial attempt. Do not create the missing relations manually.

The migration adds parent-owned child profiles, a central points ledger, Quran session and daily/weekly aggregates, opt-in leaderboard RPCs, Surah/Juz progress, completion and reciter records, badges, challenges, administrator analytics, settings, and row-level security. The web app uses the signed-in user's Supabase session; do not expose a service-role key in browser code.

The Quran page has a separate listening leaderboard and a recent activity feed (latest 30 days, at most 30 entries) showing the opted-in nickname, reciter, Surah/Juz, minutes, and session date. Parents can hide a profile from both public views using its leaderboard setting.

The listening player reports playback state every 15 seconds. The database derives elapsed time from server timestamps, counts no more than 30 seconds per heartbeat, rejects concurrent sessions for the same child, and applies point caps and idempotency keys inside database functions. Surah/Juz rewards are one-time per child and require a naturally ended player session with at least the configured minimum listening duration.

This is best-effort browser anti-cheat rather than proof that a person heard every audio sample: a determined authenticated user can imitate browser heartbeat requests. Do not describe it as cryptographic or tamper-proof verification. The web UI never submits point totals; all point calculations and ledger writes are performed by database functions.

`/kids-zone` creates and manages child nicknames and shows global points. `/quran/listen` shows Quran-specific progress and its separate leaderboard while recording audio playback. `/admin/kids-zone` is available to site administrators for analytics and point/challenge settings.
