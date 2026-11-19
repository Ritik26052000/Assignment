import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Activity, Menu, PanelLeftOpen, Search, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useMatch } from 'react-router-dom'
import { AppSidebar } from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import { WorkspaceProvider } from '@/context/WorkspaceProvider'
import { useWorkspace } from '@/context/WorkspaceContext'
import { getStoredSidebarCollapsed, setStoredSidebarCollapsed } from '@/lib/sidebar-storage'
import { cn } from '@/lib/utils'

function formatHeaderDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function ShellBreadcrumbs() {
  const location = useLocation()
  const boardMatch = useMatch('/projects/:id')
  const { activeProject } = useWorkspace()

  const crumbs = useMemo(() => {
    if (boardMatch) {
      return [
        { label: 'Projects', to: '/projects' },
        { label: activeProject?.name ?? 'Board', to: null },
      ]
    }
    if (location.pathname.startsWith('/projects')) {
      return [{ label: 'Projects', to: null }]
    }
    if (location.pathname.startsWith('/team')) {
      return [{ label: 'Team', to: null }]
    }
    if (location.pathname.startsWith('/activity')) {
      return [{ label: 'Activity', to: null }]
    }
    if (location.pathname.startsWith('/settings')) {
      return [{ label: 'Settings', to: null }]
    }
    return [{ label: 'Overview', to: null }]
  }, [activeProject?.name, boardMatch, location.pathname])

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary"
        aria-hidden
      >
        <Sparkles className="size-3.5" />
      </span>
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <span className="text-muted-foreground">/</span>}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="truncate font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'truncate font-semibold',
                    isLast ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function ShellChrome() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => getStoredSidebarCollapsed())
  const closeMobile = () => setMobileOpen(false)

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      setStoredSidebarCollapsed(next)
      return next
    })
  }

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <div className="sticky top-0 hidden h-svh lg:flex">
        <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </div>

      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 w-[17.5rem] outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Workspace navigation and settings
            </DialogPrimitive.Description>
            <AppSidebar
              onNavigate={closeMobile}
              showCollapseToggle={false}
              className="h-full shadow-xl"
            />
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3"
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-[#f8fafc]/90 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              {collapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:inline-flex"
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                  onClick={toggleCollapsed}
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              )}
              <ShellBreadcrumbs />
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <p className="hidden text-sm text-muted-foreground md:block">{formatHeaderDate()}</p>
              <Button variant="ghost" size="icon" asChild aria-label="Search projects">
                <Link to="/projects">
                  <Search className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild aria-label="View activity">
                <Link to="/activity">
                  <Activity className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 sm:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function AppShell() {
  return (
    <WorkspaceProvider>
      <ShellChrome />
    </WorkspaceProvider>
  )
}
