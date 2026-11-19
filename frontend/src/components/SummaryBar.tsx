import { AlertCircle, CheckCircle2, Circle, Clock3 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ProjectSummaryDto } from '@/types'

interface SummaryBarProps {
  summary?: ProjectSummaryDto
  isLoading?: boolean
  isError?: boolean
}

function Stat({
  label,
  value,
  tone,
  children,
}: {
  label: string
  value: number
  tone?: 'default' | 'danger'
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex min-w-[7rem] flex-1 flex-col gap-1 rounded-xl border bg-card px-4 py-3 shadow-xs',
        tone === 'danger' && value > 0 && 'border-rose-200 bg-rose-50',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold text-muted-foreground',
          tone === 'danger' && value > 0 && 'text-rose-700',
        )}
      >
        {children}
        {label}
      </span>
      <span
        className={cn(
          'text-2xl font-extrabold tracking-tight tabular-nums',
          tone === 'danger' && value > 0 && 'text-rose-700',
        )}
      >
        {String(value).padStart(2, '0')}
      </span>
    </div>
  )
}

export function SummaryBar({ summary, isLoading, isError }: SummaryBarProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3" aria-busy="true" aria-label="Loading summary">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] min-w-[7rem] flex-1 rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError || !summary) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Summary is unavailable right now.
      </p>
    )
  }

  return (
    <section aria-label="Project summary" className="flex flex-wrap gap-3">
      <Stat label="Total tasks" value={summary.total}>
        <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
      </Stat>
      <Stat label="To do" value={summary.byStatus.TODO ?? 0}>
        <Circle className="size-3.5 text-sky-600" aria-hidden />
      </Stat>
      <Stat label="In progress" value={summary.byStatus.IN_PROGRESS ?? 0}>
        <Clock3 className="size-3.5 text-amber-600" aria-hidden />
      </Stat>
      <Stat label="Overdue" value={summary.overdue} tone="danger">
        <AlertCircle className="size-3.5" aria-hidden />
      </Stat>
    </section>
  )
}
