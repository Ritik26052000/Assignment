import { ArrowUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEFAULT_SORT, PRIORITY_LABEL, SORT_OPTIONS } from '@/lib/task-meta'
import {
  ASSIGNEE_FILTER_UNASSIGNED,
  TASK_PRIORITIES,
  type TaskFilters,
  type TaskPriority,
} from '@/types'

const ALL = 'all'

interface FilterBarProps {
  filters: Omit<TaskFilters, 'status'>
  users: Array<{ id: string; name: string }>
  onChange: (patch: Partial<Omit<TaskFilters, 'status'>>) => void
  onClear: () => void
  hasActiveFilters: boolean
}

function assigneeSelectValue(assigneeId: string | undefined): string {
  if (assigneeId === ASSIGNEE_FILTER_UNASSIGNED) return ASSIGNEE_FILTER_UNASSIGNED
  if (assigneeId) return assigneeId
  return ALL
}

export function FilterBar({ filters, users, onChange, onClear, hasActiveFilters }: FilterBarProps) {
  return (
    <div
      role="group"
      aria-label="Task filters"
      className="flex flex-wrap items-center gap-2"
    >
      <Select
        value={filters.priority ?? ALL}
        onValueChange={(v) => onChange({ priority: v === ALL ? undefined : (v as TaskPriority) })}
      >
        <SelectTrigger aria-label="Filter by priority" className="h-9 w-full sm:w-40">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={assigneeSelectValue(filters.assigneeId)}
        onValueChange={(v) => {
          if (v === ALL) onChange({ assigneeId: undefined })
          else onChange({ assigneeId: v })
        }}
      >
        <SelectTrigger aria-label="Filter by assignee" className="h-9 w-full sm:w-44">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Everyone</SelectItem>
          <SelectItem value={ASSIGNEE_FILTER_UNASSIGNED}>Unassigned</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sort ?? DEFAULT_SORT}
        onValueChange={(v) => onChange({ sort: v === DEFAULT_SORT ? undefined : v })}
      >
        <SelectTrigger aria-label="Sort tasks" className="h-9 w-full sm:w-48">
          <ArrowUpDown className="size-4 opacity-60" aria-hidden />
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X /> Clear
        </Button>
      )}
    </div>
  )
}
