/** Placeholder skeleton cards shown while projects load. */
export default function SkeletonCard() {
  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-16 w-16 !rounded-full" />
      </div>
      <div className="mb-3 flex gap-2">
        <div className="skeleton h-6 w-16 !rounded-full" />
        <div className="skeleton h-6 w-20 !rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-6 w-14 !rounded-full" />
        <div className="skeleton h-6 w-14 !rounded-full" />
        <div className="skeleton h-6 w-14 !rounded-full" />
      </div>
    </div>
  )
}
