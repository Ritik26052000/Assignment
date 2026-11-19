const KEY = 'taskflow.activeWorkspaceId'

export function getStoredWorkspaceId(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setStoredWorkspaceId(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* ignore quota / private mode */
  }
}
