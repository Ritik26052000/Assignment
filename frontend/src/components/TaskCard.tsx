import { AlertCircle, CalendarDays, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, isOverdue } from '@/lib/dates'
import { PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL } from '@/lib/task-meta'
import { cn, getInitials } from '@/lib/utils'
import { TASK_STATUSES, type TaskDto, type TaskStatus } from '@/types'

interface TaskCardProps {
  task: TaskDto
  onEdit?: (task: TaskDto) => void
  onDelete?: (task: TaskDto) => void
  onMove?: (task: TaskDto, status: TaskStatus) => void
  className?: string
  isDragging?: boolean
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
  className,
  isDragging,
}: TaskCardProps) {
  const overdue = isOverdue(task.dueDate, task.status)
  const moveTargets = TASK_STATUSES.filter((s) => s !== task.status)

  return (
    <article
      data-testid="task-card"
      aria-label={task.title}
      className={cn(
        'group relative rounded-xl border bg-card p-3 shadow-xs transition-shadow hover:shadow-md',
        overdue && 'border-rose-200 bg-rose-50/40',
        isDragging && 'opacity-40',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge className={PRIORITY_STYLE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
            {overdue && (
              <Badge variant="destructive" className="bg-rose-100 text-rose-700">
                <AlertCircle aria-hidden />
                Overdue
              </Badge>
            )}
          </div>

          {(onEdit || onDelete || onMove) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mt-1 -mr-1 size-7 shrink-0 text-muted-foreground"
                  aria-label={`Actions for ${task.title}`}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onSelect={() => onEdit(task)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                )}
                {onMove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                      Move to
                    </DropdownMenuLabel>
                    {moveTargets.map((status) => (
                      <DropdownMenuItem key={status} onSelect={() => onMove(task, status)}>
                        {STATUS_LABEL[status]}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => onDelete(task)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <h3 className="text-sm leading-snug font-semibold break-words">{task.title}</h3>

        {task.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {task.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs',
                overdue ? 'font-medium text-rose-700' : 'text-muted-foreground',
              )}
            >
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDate(task.dueDate)}
            </span>
          )}

          {task.assignee && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="size-5">
                <AvatarFallback className="text-[10px]">
                  {getInitials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[7rem] truncate">{task.assignee.name}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
