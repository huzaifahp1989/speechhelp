export default function Loading() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading Quran...</p>
      </div>
    </div>
  );
}
