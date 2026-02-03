// app/loading.tsx
export default function PageLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Logo */}
        <div className="relative">
          {/* Outer Ring */}
          {/* <div className="absolute inset-0 w-32 h-32 border-4 border-slate-200 dark:border-slate-700 rounded-full animate-ping opacity-20" /> */}
          
          {/* Middle Ring */}
          {/* <div className="absolute inset-2 w-28 h-28 border-4 border-slate-300 dark:border-slate-600 rounded-full animate-spin" style={{ animationDuration: '3s' }} /> */}
          
          {/* Inner Circle with Logo */}
          {/* <div className="relative w-32 h-32 bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-100 rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-white dark:text-slate-900 font-bold text-4xl">P</span>
          </div> */}
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            กำลังโหลด...
          </h2>
          
          {/* Animated Dots */}
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-slate-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-slate-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-slate-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white rounded-full animate-pulse" 
               style={{ width: '60%', animation: 'progress 2s ease-in-out infinite' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}