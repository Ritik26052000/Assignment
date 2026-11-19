import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  usersApi,
  type CreateUserRequest,
  type ListUsersParams,
  type UpdateUserRequest,
} from '@/api/users.api'
import { queryKeys } from '@/lib/query-keys'

/** Full-ish user directory for assignee pickers (capped by backend max page size). */
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.usersList({ page: 0, size: 100 }),
    queryFn: async () => {
      const page = await usersApi.list({ page: 0, size: 100 })
      return page.content
    },
    staleTime: 5 * 60_000,
  })
}

/** Paginated team directory with search. */
export function useUsersPage(params: ListUsersParams) {
  return useQuery({
    queryKey: queryKeys.usersList(params),
    queryFn: () => usersApi.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  })
}
