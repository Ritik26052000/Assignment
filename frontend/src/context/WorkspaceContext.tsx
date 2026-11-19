import { createContext, useContext, type ReactNode } from 'react'
import type { ProjectDto } from '@/types'

export interface WorkspaceContextValue {
  projects: ProjectDto[]
  isLoading: boolean
  activeProject: ProjectDto | null
  activeProjectId: string | null
  /** Remember a workspace; navigate to its board when already on a board. */
  selectWorkspace: (projectId: string) => void
  /** Always open the project board. */
  openWorkspaceBoard: (projectId: string) => void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within a <WorkspaceProvider>')
  return ctx
}

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue
  children: ReactNode
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
