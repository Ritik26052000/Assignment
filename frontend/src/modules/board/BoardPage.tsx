import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { FolderSearch, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FilterBar } from '@/components/FilterBar'
import { SummaryBar } from '@/components/SummaryBar'
import { TaskCard } from '@/components/TaskCard'
import { TaskColumn } from '@/components/TaskColumn'
import { TaskFormDialog } from '@/components/TaskFormDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError, getErrorMessage } from '@/lib/errors'
import { STATUS_LABEL } from '@/lib/task-meta'
import { useMediaQuery } from '@/lib/use-media-query'
import { useProject } from '@/modules/projects/hooks/useProjects'
import { TASK_STATUSES, type TaskDto, type TaskStatus, type TaskUpsertRequest } from '@/types'
import { useBoardFilters } from './hooks/useBoardFilters'
import { useMoveTask } from './hooks/useMoveTask'
import { useSummary } from './hooks/useSummary'
import { useCreateTask, useDeleteTask, useUpdateTask } from './hooks/useTaskMutations'
import { useTasks } from './hooks/useTasks'
import { useUsers } from './hooks/useUsers'

/** Prefer the column under the pointer, falling back to rectangle overlap. */
const collisionDetection: CollisionDetection = (args) => {
  const withinPointer = pointerWithin(args)
  return withinPointer.length > 0 ? withinPointer : rectIntersection(args)
}

interface FormState {
  open: boolean
  task: TaskDto | null
  status: TaskStatus
}

export function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''

  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { filters, setFilters, clearFilters, hasActiveFilters } = useBoardFilters()

  const project = useProject(projectId)
  const summary = useSummary(projectId)
  const users = useUsers()

  const todo = useTasks(projectId, 'TODO', filters)
  const inProgress = useTasks(projectId, 'IN_PROGRESS', filters)
  const done = useTasks(projectId, 'DONE', filters)
  const columnQueries = { TODO: todo, IN_PROGRESS: inProgress, DONE: done }

  const createTask = useCreateTask(projectId)
  const updateTask = useUpdateTask(projectId)
  const deleteTask = useDeleteTask(projectId)
  const moveTask = useMoveTask(projectId)

  const [form, setForm] = useState<FormState>({ open: false, task: null, status: 'TODO' })
  const [taskToDelete, setTaskToDelete] = useState<TaskDto | null>(null)
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null)
  const [activeTab, setActiveTab] = useState<TaskStatus>('TODO')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  /* ---------- handlers ---------- */

  const openCreate = (status: TaskStatus) => setForm({ open: true, task: null, status })
  const openEdit = (task: TaskDto) => setForm({ open: true, task, status: task.status })

  const handleSubmitTask = async (data: TaskUpsertRequest) => {
    if (form.task) {
      await updateTask.mutateAsync({ taskId: form.task.id, data })
      toast.success('Task updated')
    } else {
      await createTask.mutateAsync(data)
      toast.success('Task created')
    }
  }

  const handleMove = (task: TaskDto, status: TaskStatus) => {
    if (task.status === status) return
    moveTask.mutate(
      { task, status },
      { onSuccess: () => toast.success(`Moved to ${STATUS_LABEL[status]}`) },
    )
  }

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return
    try {
      await deleteTask.mutateAsync(taskToDelete.id)
      toast.success('Task deleted')
      setTaskToDelete(null)
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't delete the task"))
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask((event.active.data.current?.task as TaskDto | undefined) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const task = event.active.data.current?.task as TaskDto | undefined
    const target = event.over?.id
    setActiveTask(null)
    if (!task || typeof target !== 'string') return
    if ((TASK_STATUSES as readonly string[]).includes(target)) {
      handleMove(task, target as TaskStatus)
    }
  }

  /* ---------- render helpers ---------- */

  const renderColumn = (status: TaskStatus, hideHeader = false) => {
    const query = columnQueries[status]
    return (
      <TaskColumn
        status={status}
        tasks={query.data?.tasks ?? []}
        total={query.data?.total ?? 0}
        isLoading={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        hasMore={!!query.hasNextPage}
        isLoadingMore={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
        onAddTask={openCreate}
        onEdit={openEdit}
        onDelete={setTaskToDelete}
        onMove={handleMove}
        dndEnabled={isDesktop}
        hasFilters={hasActiveFilters}
        hideHeader={hideHeader}
      />
    )
  }

  /* ---------- states ---------- */

  if (!projectId || (project.error instanceof ApiError && project.error.status === 404)) {
    return (
      <EmptyState
        icon={FolderSearch}
        title="Project not found"
        description="This project doesn't exist or you don't have access to it."
        action={
          <Button asChild>
            <Link to="/projects">Back to projects</Link>
          </Button>
        }
      />
    )
  }

  if (project.isError) {
    return (
      <ErrorState
        title="Couldn't load this project"
        error={project.error}
        onRetry={() => void project.refetch()}
      />
    )
  }

  return (
    <div className="space-y-5">
      <SummaryBar summary={summary.data} isLoading={summary.isPending} isError={summary.isError} />

      <div className="flex flex-wrap items-center gap-2">
        <FilterBar
          filters={filters}
          users={users.data ?? []}
          onChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <Button
          className="ml-auto shrink-0"
          onClick={() => openCreate(isDesktop ? 'TODO' : activeTab)}
        >
          <Plus /> New task
        </Button>
      </div>

      {isDesktop ? (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
        >
          <div className="grid grid-cols-3 items-start gap-4">
            {TASK_STATUSES.map((status) => (
              <div key={status}>{renderColumn(status)}</div>
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTask && <TaskCard task={activeTask} className="rotate-1 shadow-xl" />}
          </DragOverlay>
        </DndContext>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaskStatus)}>
          <TabsList>
            {TASK_STATUSES.map((status) => (
              <TabsTrigger key={status} value={status}>
                {STATUS_LABEL[status]}
                <span className="text-xs tabular-nums opacity-70">
                  {columnQueries[status].data?.total ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {TASK_STATUSES.map((status) => (
            <TabsContent key={status} value={status}>
              {renderColumn(status, true)}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <TaskFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        task={form.task}
        defaultStatus={form.status}
        users={users.data ?? []}
        onSubmit={handleSubmitTask}
      />

      <ConfirmDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && !deleteTask.isPending && setTaskToDelete(null)}
        title="Delete this task?"
        description={
          <>
            <strong className="font-semibold text-foreground">{taskToDelete?.title}</strong> will be
            permanently deleted. This can't be undone.
          </>
        }
        confirmLabel="Delete task"
        loading={deleteTask.isPending}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}
