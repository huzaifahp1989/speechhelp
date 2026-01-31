export default function Loading() {
  return (
    <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading Collections...</p>
      </div>
    </div>
  );
}
