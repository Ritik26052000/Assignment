import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { WorkspaceProvider as Provider } from '@/context/WorkspaceContext'
import { getStoredWorkspaceId, setStoredWorkspaceId } from '@/lib/workspace-storage'
import { useProjects } from '@/modules/projects/hooks/useProjects'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const boardMatch = useMatch('/projects/:id')
  const routeProjectId = boardMatch?.params.id
  const { data: projects = [], isPending } = useProjects()
  const [preferredId, setPreferredId] = useState<string | null>(() => getStoredWorkspaceId())

  useEffect(() => {
    if (!routeProjectId) return
    setPreferredId(routeProjectId)
    setStoredWorkspaceId(routeProjectId)
  }, [routeProjectId])

  useEffect(() => {
    if (!preferredId || projects.length === 0) return
    if (!projects.some((project) => project.id === preferredId)) {
      setPreferredId(null)
    }
  }, [preferredId, projects])

  const activeProjectId = useMemo(() => {
    if (routeProjectId && projects.some((project) => project.id === routeProjectId)) {
      return routeProjectId
    }
    if (preferredId && projects.some((project) => project.id === preferredId)) {
      return preferredId
    }
    return projects[0]?.id ?? null
  }, [routeProjectId, preferredId, projects])

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null

  const selectWorkspace = (projectId: string) => {
    setPreferredId(projectId)
    setStoredWorkspaceId(projectId)
    if (boardMatch) {
      navigate(`/projects/${projectId}`)
    }
  }

  const openWorkspaceBoard = (projectId: string) => {
    setPreferredId(projectId)
    setStoredWorkspaceId(projectId)
    navigate(`/projects/${projectId}`)
  }

  return (
    <Provider
      value={{
        projects,
        isLoading: isPending,
        activeProject,
        activeProjectId,
        selectWorkspace,
        openWorkspaceBoard,
      }}
    >
      {children}
    </Provider>
  )
}
