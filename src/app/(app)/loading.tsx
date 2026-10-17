import { Skeleton } from "@/components/ui/skeleton";

/** Shown while a protected page streams in — keeps navigation feeling instant. */
export default function Loading() {
  return (
    <div>
      <div className="space-y-1 mb-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Skeleton className="h-44 w-full rounded-3xl mb-4" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>

      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 flex-1 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
