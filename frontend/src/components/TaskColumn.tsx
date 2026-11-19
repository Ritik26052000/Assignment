import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Loader2, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { TaskCard } from '@/components/TaskCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_DOT, STATUS_LABEL } from '@/lib/task-meta'
import { cn } from '@/lib/utils'
import type { TaskDto, TaskStatus } from '@/types'

interface TaskColumnProps {
  status: TaskStatus
  tasks: TaskDto[]
  total: number
  isLoading: boolean
  error?: unknown
  isError: boolean
  onRetry: () => void
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  onAddTask: (status: TaskStatus) => void
  onEdit: (task: TaskDto) => void
  onDelete: (task: TaskDto) => void
  onMove: (task: TaskDto, status: TaskStatus) => void
  /** Enable drag & drop (desktop). On mobile the "Move to" menu is used instead. */
  dndEnabled: boolean
  hasFilters?: boolean
  /** Hide the column header (when rendered inside a tab). */
  hideHeader?: boolean
}

function DraggableTask({
  task,
  onEdit,
  onDelete,
  onMove,
}: Pick<TaskColumnProps, 'onEdit' | 'onDelete' | 'onMove'> & { task: TaskDto }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn('touch-none', isDragging && 'relative z-10')}
      {...listeners}
      {...attributes}
    >
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        onMove={onMove}
        isDragging={isDragging}
        className="cursor-grab active:cursor-grabbing"
      />
    </div>
  )
}

function StaticTask({
  task,
  onEdit,
  onDelete,
  onMove,
}: Pick<TaskColumnProps, 'onEdit' | 'onDelete' | 'onMove'> & { task: TaskDto }) {
  return <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
}

export function TaskColumn({
  status,
  tasks,
  total,
  isLoading,
  isError,
  error,
  onRetry,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onAddTask,
  onEdit,
  onDelete,
  onMove,
  dndEnabled,
  hasFilters,
  hideHeader,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !dndEnabled })
  const Item = dndEnabled ? DraggableTask : StaticTask

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABEL[status]} column`}
      className={cn(
        'flex min-h-48 flex-col gap-3 rounded-2xl border bg-slate-100/60 p-3 transition-colors',
        isOver && 'border-primary/50 bg-accent/70 ring-2 ring-primary/20',
      )}
    >
      {!hideHeader && (
        <header className="flex items-center justify-between gap-2 px-1">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <span className={cn('size-2.5 rounded-full', STATUS_DOT[status])} aria-hidden />
            {STATUS_LABEL[status]}
            <span
              className="rounded-md bg-card px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums shadow-xs"
              aria-label={`${total} tasks`}
            >
              {total}
            </span>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onAddTask(status)}
            aria-label={`Add task to ${STATUS_LABEL[status]}`}
          >
            <Plus />
          </Button>
        </header>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError && tasks.length === 0 ? (
        <ErrorState
          title="Couldn't load tasks"
          error={error}
          onRetry={onRetry}
          className="px-3 py-8"
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          compact
          title={hasFilters ? 'No matching tasks' : 'No tasks'}
          action={
            !hasFilters && (
              <Button variant="outline" size="sm" onClick={() => onAddTask(status)}>
                <Plus /> Add task
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <Item task={task} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
            </li>
          ))}
        </ul>
      )}

      {hasMore && !isLoading && (
        <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoadingMore}>
          {isLoadingMore && <Loader2 className="animate-spin" />}
          Load more
        </Button>
      )}
    </section>
  )
}
