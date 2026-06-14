import React from 'react';

// Single movie card placeholder
export const SkeletonCard: React.FC = () => {
  return (
    <div className="w-full aspect-[2/3] rounded-[2rem] md:rounded-[3.5rem] bg-zinc-900/60 border border-white/5 relative overflow-hidden animate-pulse shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    </div>
  );
};

// Grid of movie cards
interface SkeletonGridProps {
  title?: string;
  count?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ title, count = 12 }) => {
  return (
    <div className="mb-10 md:mb-20 px-6 md:px-20 relative z-20">
      {title && (
        <div className="flex items-center mb-8">
          <div className="w-1.5 md:w-2 h-8 md:h-10 bg-zinc-800 rounded-full me-4 md:me-6 animate-pulse" />
          <div className="h-6 md:h-8 w-48 bg-zinc-900 rounded-lg animate-pulse" />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
        {Array.from({ length: count }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    </div>
  );
};

// Hero banner placeholder
export const SkeletonBanner: React.FC = () => {
  return (
    <div className="relative w-full h-[75vh] md:h-[95vh] bg-zinc-950/40 animate-pulse flex flex-col justify-end p-6 md:p-20 overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      
      <div className="max-w-4xl space-y-6 relative z-10">
        {/* Badges */}
        <div className="flex items-center gap-3">
          <div className="h-6 w-32 bg-zinc-900 rounded-full" />
          <div className="h-6 w-20 bg-zinc-900 rounded-full" />
        </div>
        
        {/* Title */}
        <div className="h-16 md:h-28 w-2/3 md:w-1/2 bg-zinc-900 rounded-2xl md:rounded-[2rem]" />
        
        {/* Rating/Metadata */}
        <div className="flex items-center gap-4">
          <div className="h-8 w-16 bg-zinc-900 rounded-xl" />
          <div className="h-8 w-20 bg-zinc-900 rounded-xl" />
          <div className="h-8 w-16 bg-zinc-900 rounded-xl" />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4">
          <div className="h-14 md:h-18 w-40 md:w-56 bg-zinc-900 rounded-2xl md:rounded-[1.5rem]" />
          <div className="h-14 md:h-18 w-40 md:w-56 bg-zinc-900 rounded-2xl md:rounded-[1.5rem]" />
        </div>
      </div>
    </div>
  );
};

// Full detail page layout placeholder
export const SkeletonDetailPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-black text-white overflow-hidden pb-20">
      {/* Banner */}
      <SkeletonBanner />
      
      {/* Detail description section */}
      <div className="container mx-auto px-6 lg:px-20 py-16 md:py-24">
        {/* Overview Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 md:gap-20">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-10 bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-6 w-32 bg-zinc-900 rounded-md animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-5 w-full bg-zinc-900 rounded-md animate-pulse" />
              <div className="h-5 w-full bg-zinc-900 rounded-md animate-pulse" />
              <div className="h-5 w-4/5 bg-zinc-900 rounded-md animate-pulse" />
            </div>
            
            {/* Cast Grid */}
            <div className="pt-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-8 w-44 bg-zinc-900 rounded-lg animate-pulse" />
                <div className="h-0.5 flex-grow bg-zinc-900 rounded-full" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="aspect-[3/4] w-full rounded-2xl bg-zinc-900 animate-pulse" />
                    <div className="h-3 w-3/4 bg-zinc-900 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Recommendations Row */}
        <div className="mt-20">
          <div className="flex items-center mb-8">
            <div className="w-1.5 h-10 bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-6 w-44 bg-zinc-900 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex-shrink-0 w-36 md:w-64 aspect-[2/3] rounded-[2rem] md:rounded-[3.5rem] bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reel/Shorts page loading mockup
export const SkeletonShorts: React.FC = () => {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-black relative p-6">
      <div className="w-[380px] h-[640px] max-h-[90vh] rounded-[3rem] bg-zinc-900 border border-white/5 relative overflow-hidden animate-pulse shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Right floating buttons overlay */}
        <div className="absolute right-6 bottom-24 flex flex-col gap-6">
          <div className="w-12 h-12 rounded-full bg-zinc-800" />
          <div className="w-12 h-12 rounded-full bg-zinc-800" />
          <div className="w-12 h-12 rounded-full bg-zinc-800" />
        </div>
        
        {/* Details overlay */}
        <div className="absolute bottom-8 left-8 right-16 space-y-3">
          <div className="h-4 w-1/3 bg-zinc-800 rounded" />
          <div className="h-3 w-3/4 bg-zinc-800 rounded" />
          <div className="h-3 w-1/2 bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  );
};

// Profile settings loading mockup
export const SkeletonProfile: React.FC = () => {
  return (
    <div className="min-h-screen bg-black py-20 px-6 md:px-32 animate-pulse space-y-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-2 h-10 bg-zinc-800 rounded-full" />
        <div className="h-8 w-64 bg-zinc-900 rounded-lg" />
      </div>
      
      {/* Profile info block */}
      <div className="bg-zinc-900/20 border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6 max-w-2xl">
        <div className="w-20 h-20 rounded-full bg-zinc-900" />
        <div className="space-y-3 flex-grow">
          <div className="h-5 w-40 bg-zinc-900 rounded" />
          <div className="h-3 w-56 bg-zinc-900 rounded" />
        </div>
      </div>
      
      {/* Settings list mockup */}
      <div className="max-w-2xl space-y-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-16 w-full bg-zinc-900/20 border border-white/5 rounded-3xl flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-lg bg-zinc-900" />
              <div className="h-4 w-32 bg-zinc-900 rounded" />
            </div>
            <div className="w-10 h-6 rounded-full bg-zinc-900" />
          </div>
        ))}
      </div>
    </div>
  );
};
