import React from 'react';

export interface LoadingSkeletonProps {
  type?: 'card' | 'stats' | 'list-detail' | 'table';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  className = '',
}) => {
  if (type === 'stats') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
            <div className="h-8 w-20 bg-slate-200 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list-detail') {
    return (
      <div className={`w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs grid grid-cols-1 lg:grid-cols-12 min-h-[500px] animate-pulse ${className}`}>
        <div className="lg:col-span-5 border-r border-slate-200/80 p-4 space-y-3">
          <div className="h-9 w-full bg-slate-100 rounded-xl" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-slate-100 rounded-lg" />
            <div className="h-6 w-16 bg-slate-100 rounded-lg" />
            <div className="h-6 w-16 bg-slate-100 rounded-lg" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="space-y-1 flex-1">
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-7 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-200" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-24 w-full bg-slate-50 rounded-xl border border-slate-100" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-3/4 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-xs"
        >
          <div className="h-4 w-1/3 bg-slate-200 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-2/3 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
