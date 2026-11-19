import { LogOut, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/dates'
import { getInitials } from '@/lib/utils'
import type { UpdateUserFormValues } from '@/lib/validation'
import { UserFormDialog } from '@/modules/team/UserFormDialog'
import { useUpdateUser } from '@/modules/team/hooks/useUsers'

export function SettingsPage() {
  const { user, logout, setCurrentUser } = useAuth()
  const navigate = useNavigate()
  const updateUser = useUpdateUser()
  const [editOpen, setEditOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  const handleSubmit = async (data: UpdateUserFormValues) => {
    if (!user) return
    const password = data.password?.trim()
    const updated = await updateUser.mutateAsync({
      id: user.id,
      data: {
        name: data.name,
        email: data.email,
        password: password ? password : undefined,
      },
    })
    setCurrentUser(updated)
    toast.success('Profile updated')
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{user.name}</CardTitle>
            <CardDescription className="truncate">{user.email}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/40 px-3 py-2">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Email
              </dt>
              <dd className="mt-1 font-medium break-all">{user.email}</dd>
            </div>
            <div className="rounded-lg border bg-muted/40 px-3 py-2">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Member since
              </dt>
              <dd className="mt-1 font-medium">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>

          <Button variant="outline" className="w-full sm:w-auto" onClick={handleLogout}>
            <LogOut /> Log out
          </Button>
        </CardContent>
      </Card>

      <UserFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
