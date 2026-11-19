import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/api/projects.api'
import { queryKeys } from '@/lib/query-keys'
import type { CreateProjectRequest } from '@/types'

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: projectsApi.list })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
    retry: (count, error) => (error as { status?: number }).status !== 404 && count < 2,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  })
}
