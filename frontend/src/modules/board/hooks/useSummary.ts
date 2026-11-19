import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '@/api/projects.api'
import { queryKeys } from '@/lib/query-keys'

export function useSummary(projectId: string) {
  return useQuery({
    queryKey: queryKeys.summary(projectId),
    queryFn: () => projectsApi.summary(projectId),
    enabled: !!projectId,
  })
}
