import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <EmptyState
        className="w-full"
        icon={Compass}
        title="404 — Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild>
            <Link to="/overview">Back to overview</Link>
          </Button>
        }
      />
    </main>
  )
}
