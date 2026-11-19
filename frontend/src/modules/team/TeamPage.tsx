import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/context/AuthContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate } from '@/lib/dates'
import { getErrorMessage } from '@/lib/errors'
import { getInitials } from '@/lib/utils'
import type { CreateUserFormValues, UpdateUserFormValues } from '@/lib/validation'
import type { UserDto } from '@/types'
import { UserFormDialog } from './UserFormDialog'
import { useCreateUser, useDeleteUser, useUpdateUser, useUsersPage } from './hooks/useUsers'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

function TeamTableSkeleton({ rows }: { rows: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-card shadow-xs"
      aria-busy="true"
      aria-label="Loading team"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Joined</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-44" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto size-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function TeamPage() {
  const navigate = useNavigate()
  const { user: currentUser, logout, setCurrentUser } = useAuth()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)

  const { data, isPending, isError, error, isFetching, refetch } = useUsersPage({
    search: debouncedSearch || undefined,
    page,
    size: pageSize,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserDto | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserDto | null>(null)

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, pageSize])

  useEffect(() => {
    if (!data) return
    if (data.totalPages > 0 && page > data.totalPages - 1) {
      setPage(data.totalPages - 1)
    }
  }, [data, page])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (user: UserDto) => {
    setEditing(user)
    setFormOpen(true)
  }

  const handleSubmit = async (formData: CreateUserFormValues | UpdateUserFormValues) => {
    if (editing) {
      const password = formData.password?.trim()
      const updated = await updateUser.mutateAsync({
        id: editing.id,
        data: {
          name: formData.name,
          email: formData.email,
          password: password ? password : undefined,
        },
      })
      if (updated.id === currentUser?.id) setCurrentUser(updated)
      toast.success('User updated')
    } else {
      await createUser.mutateAsync(formData as CreateUserFormValues)
      toast.success('User created')
    }
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    const deletingSelf = userToDelete.id === currentUser?.id
    try {
      await deleteUser.mutateAsync(userToDelete.id)
      toast.success('User deleted')
      setUserToDelete(null)
      if (deletingSelf) {
        logout()
        navigate('/login', { replace: true })
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete the user"))
    }
  }

  const users = data?.content ?? []
  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0
  const from = totalElements === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, totalElements)
  const showEmpty = !isPending && !isError && users.length === 0
  const hasSearch = debouncedSearch.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search team members"
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate} className="shrink-0 self-end sm:self-auto">
          <Plus /> New user
        </Button>
      </div>

      {isPending && !data ? (
        <TeamTableSkeleton rows={Math.min(pageSize, 8)} />
      ) : isError ? (
        <ErrorState title="Couldn't load team" error={error} onRetry={() => void refetch()} />
      ) : showEmpty ? (
        <EmptyState
          icon={Users}
          title={hasSearch ? 'No members match your search' : 'No teammates yet'}
          action={
            hasSearch ? (
              <Button variant="outline" onClick={() => setSearchInput('')}>
                Clear search
              </Button>
            ) : (
              <Button onClick={openCreate}>
                <Plus /> New user
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          <div
            className={`overflow-hidden rounded-xl border bg-card shadow-xs transition-opacity ${
              isFetching ? 'opacity-70' : ''
            }`}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground sm:hidden">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-[16rem] truncate sm:table-cell">
                      {user.email}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            aria-label={`Actions for ${user.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onSelect={() => openEdit(user)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setUserToDelete(user)}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {totalElements === 0 ? 'No results' : `Showing ${from}–${to} of ${totalElements}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) =>
                    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
                  }
                >
                  <SelectTrigger aria-label="Rows per page" className="h-9 w-[4.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={page <= 0 || isFetching}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </Button>
                <span className="min-w-20 px-2 text-center text-sm text-muted-foreground">
                  Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={data?.last || totalPages === 0 || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && !deleteUser.isPending && setUserToDelete(null)}
        title="Delete this user?"
        description={
          <>
            <strong className="font-semibold text-foreground">{userToDelete?.name}</strong> will be
            removed. Tasks assigned to them become unassigned. Users who own projects cannot be
            deleted.
          </>
        }
        confirmLabel="Delete user"
        loading={deleteUser.isPending}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}
