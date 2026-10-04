import KidsZonePanel from '@/components/kids/KidsZonePanel';

export default function KidsZonePage() {
  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-3xl bg-gradient-to-br from-[#0c2549] via-[#12336b] to-[#17685f] p-6 text-white sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Learn · Listen · Grow</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Kids Zone</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
            A private family dashboard for Quran listening and approved Kids Zone activities.
            Children appear on public leaderboards only when enabled by a parent.
          </p>
        </header>
        <KidsZonePanel mode="kids" />
      </div>
    </main>
  );
}
