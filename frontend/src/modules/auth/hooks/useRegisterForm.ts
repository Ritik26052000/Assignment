import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { handleFormError } from '@/lib/errors'
import { registerSchema, type RegisterFormValues } from '../schemas'

export function useRegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    setFormError(null)
    try {
      await register({ name, email, password })
      toast.success('Account created. Welcome to TaskFlow!')
      navigate('/overview', { replace: true })
    } catch (error) {
      setFormError(handleFormError(error, form.setError, ['name', 'email', 'password']))
    }
  })

  return { form, onSubmit, formError }
}
