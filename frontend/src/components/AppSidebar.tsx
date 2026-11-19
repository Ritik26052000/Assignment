import {
  Activity,
  CheckSquare,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { cn, getInitials } from '@/lib/utils'
import { useSummary } from '@/modules/board/hooks/useSummary'

const navItems = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: false, badgeKey: 'projects' as const },
  { to: '/team', label: 'Team', icon: Users, end: true },
  { to: '/activity', label: 'Activity', icon: Activity, end: true },
] as const

interface AppSidebarProps {
  onNavigate?: () => void
  className?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Hide the desktop collapse control (e.g. mobile drawer). */
  showCollapseToggle?: boolean
}

export function AppSidebar({
  onNavigate,
  className,
  collapsed = false,
  onToggleCollapse,
  showCollapseToggle = true,
}: AppSidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { projects, isLoading, activeProject, activeProjectId, selectWorkspace, openWorkspaceBoard } =
    useWorkspace()
  const summary = useSummary(activeProjectId ?? '')

  const openTasks =
    (summary.data?.byStatus.TODO ?? 0) + (summary.data?.byStatus.IN_PROGRESS ?? 0)
  const totalTasks = summary.data?.total ?? 0
  const doneTasks = summary.data?.byStatus.DONE ?? 0
  const usagePct = totalTasks > 0 ? Math.min(100, Math.round((doneTasks / totalTasks) * 100)) : 0

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border/80 bg-[#f8fafc] transition-[width] duration-200 ease-out',
        collapsed ? 'w-[4.5rem]' : 'w-[17.5rem]',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center pt-5 pb-4',
          collapsed ? 'flex-col gap-2 px-2' : 'gap-2 px-3',
        )}
      >
        <NavLink
          to="/overview"
          aria-label="TaskFlow home"
          onClick={onNavigate}
          className={cn(
            'rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
            collapsed ? 'mx-auto' : 'px-2',
          )}
        >
          <Logo iconOnly={collapsed} />
        </NavLink>

        {showCollapseToggle && onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('size-8 shrink-0 text-muted-foreground', !collapsed && 'ml-auto')}
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        )}
      </div>

      <div className={cn(collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <p className="mb-1.5 px-2 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
            Workspace
          </p>
        )}
        {isLoading ? (
          <Skeleton className={cn('w-full rounded-xl', collapsed ? 'mx-auto size-10' : 'h-14')} />
        ) : projects.length === 0 ? (
          !collapsed && (
            <div className="rounded-xl border border-dashed bg-white/70 px-3 py-3 text-sm text-muted-foreground">
              No projects yet
            </div>
          )
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center border bg-white text-left shadow-xs transition-colors hover:bg-accent/40 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                  collapsed
                    ? 'mx-auto size-10 justify-center rounded-lg'
                    : 'w-full gap-3 rounded-xl px-3 py-2.5',
                )}
                aria-label="Switch workspace"
                title={activeProject?.name ?? 'Switch workspace'}
              >
                <Avatar className={cn(collapsed ? 'size-8 rounded-md' : 'size-9 rounded-lg')}>
                  <AvatarFallback
                    className={cn(
                      'bg-primary font-bold text-primary-foreground',
                      collapsed ? 'rounded-md text-xs' : 'rounded-lg text-sm',
                    )}
                  >
                    {getInitials(activeProject?.name ?? 'P')}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {activeProject?.name ?? 'Select project'}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {projects.length} project{projects.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side={collapsed ? 'right' : 'bottom'} className="w-[15.5rem]">
              <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onSelect={() => {
                    selectWorkspace(project.id)
                    onNavigate?.()
                  }}
                  className={cn(project.id === activeProjectId && 'bg-accent')}
                >
                  <Avatar className="size-6 rounded-md">
                    <AvatarFallback className="rounded-md bg-primary/15 text-[10px] font-bold text-primary">
                      {getInitials(project.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{project.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  if (activeProjectId) openWorkspaceBoard(activeProjectId)
                  onNavigate?.()
                }}
                disabled={!activeProjectId}
              >
                <CheckSquare /> Open board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <nav
        className={cn('mt-5 flex flex-1 flex-col gap-1', collapsed ? 'px-2' : 'px-3')}
        aria-label="Main"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const badge =
            'badgeKey' in item && item.badgeKey === 'projects'
              ? projects.length > 0
                ? openTasks > 0
                  ? openTasks
                  : projects.length
                : null
              : null

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              aria-label={item.label}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors',
                  'hover:bg-white hover:text-foreground',
                  collapsed ? 'mx-auto size-10 justify-center' : 'gap-3 px-3 py-2.5',
                  isActive &&
                    (collapsed
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'bg-primary/10 font-semibold text-primary shadow-[inset_3px_0_0_0_var(--color-primary)]'),
                )
              }
            >
              <Icon className="size-[1.15rem] shrink-0 opacity-80" aria-hidden />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && badge != null && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                  {badge}
                </span>
              )}
              {collapsed && badge != null && (
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className={cn('mt-auto space-y-3 pb-4', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <div className="rounded-xl border bg-white p-3.5 shadow-xs">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Your workspace</p>
              <CheckSquare className="size-4 text-primary" aria-hidden />
            </div>
            {activeProjectId && summary.isPending ? (
              <Skeleton className="h-2 w-full rounded-full" />
            ) : activeProject ? (
              <>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {doneTasks} of {totalTasks} completed
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{usagePct}%</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={usagePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Workspace completion"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No active workspace</p>
            )}
          </div>
        )}

        <NavLink
          to="/settings"
          title="Settings"
          aria-label="Settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground',
              collapsed ? 'mx-auto size-10 justify-center' : 'gap-3 px-3 py-2.5',
              isActive && 'bg-primary/10 font-semibold text-primary',
            )
          }
        >
          <Settings className="size-[1.15rem]" aria-hidden />
          {!collapsed && 'Settings'}
        </NavLink>

        <Button
          variant="ghost"
          className={cn(
            'text-muted-foreground',
            collapsed ? 'mx-auto size-10 px-0' : 'h-10 w-full justify-start gap-3 px-3',
          )}
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="size-[1.15rem]" />
          {!collapsed && 'Log out'}
        </Button>
      </div>
    </aside>
  )
}
