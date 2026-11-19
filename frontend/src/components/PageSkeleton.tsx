import { Skeleton } from '@/components/ui/skeleton'

/** Full-page skeleton shown while the session is restored or a route chunk loads. */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="min-h-screen">
      <div className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
