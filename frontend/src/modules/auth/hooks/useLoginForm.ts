import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { handleFormError } from '@/lib/errors'
import { loginSchema, type LoginFormValues } from '../schemas'
import { getRedirectTarget } from './redirect'

export function useLoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const user = await login({
        email: values.email.trim(),
        password: values.password,
      })
      toast.success(`Welcome back, ${user.name}!`)
      navigate(getRedirectTarget(location.state), { replace: true })
    } catch (error) {
      setFormError(handleFormError(error, form.setError, ['email', 'password']))
    }
  })

  return { form, onSubmit, formError }
}
