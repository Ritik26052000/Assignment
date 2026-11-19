import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>
      <section
        aria-labelledby="auth-title"
        className="rounded-2xl border bg-card/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8"
      >
        <header className="mb-6">
          <h1 id="auth-title" className="text-2xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </header>
        {children}
      </section>
      <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
    </main>
  )
}
