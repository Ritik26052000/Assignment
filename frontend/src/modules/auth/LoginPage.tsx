import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { LoginForm } from './LoginForm'

export function LoginPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Sign in · TaskFlow'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with your email and password to continue."
      footer={
        <>
          New to TaskFlow?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  )
}
