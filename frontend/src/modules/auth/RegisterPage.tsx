import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { RegisterForm } from './RegisterForm'

export function RegisterPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Plan projects and move work forward on a simple board."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  )
}
