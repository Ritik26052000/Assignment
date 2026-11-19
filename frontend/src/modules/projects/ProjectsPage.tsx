import { ArrowRight, FolderKanban } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/dates'
import { CreateProjectDialog } from './CreateProjectDialog'
import { useProjects } from './hooks/useProjects'

function ProjectsSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading projects"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ProjectsPage() {
  const { data: projects, isPending, isError, error, refetch } = useProjects()

  return (
    <div className="space-y-6">
      {projects && projects.length > 0 && (
        <div className="flex flex-wrap justify-end gap-4">
          <CreateProjectDialog />
        </div>
      )}

      {isPending ? (
        <ProjectsSkeleton />
      ) : isError ? (
        <ErrorState title="Couldn't load projects" error={error} onRetry={() => void refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" action={<CreateProjectDialog />} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="group block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="truncate">{project.name}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </CardTitle>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Created {formatDate(project.createdAt)}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
