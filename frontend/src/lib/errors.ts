import axios from 'axios'
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'
import type { ApiErrorBody, FieldError } from '@/types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldError[]
  readonly path?: string

  constructor(init: {
    message: string
    status: number
    code?: string
    fieldErrors?: FieldError[]
    path?: string
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code ?? 'UNKNOWN'
    this.fieldErrors = init.fieldErrors ?? []
    this.path = init.path
  }
}

/** Convert any thrown value from axios into an ApiError. */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const body = error.response?.data as Partial<ApiErrorBody> | undefined
    if (error.response) {
      return new ApiError({
        message: body?.message ?? error.message ?? 'Something went wrong',
        status: body?.status ?? error.response.status,
        code: body?.code,
        fieldErrors: body?.fieldErrors,
        path: body?.path,
      })
    }
    return new ApiError({
      message: 'Unable to reach the server. Check your connection and try again.',
      status: 0,
      code: 'NETWORK_ERROR',
    })
  }

  if (error instanceof Error) return new ApiError({ message: error.message, status: 0 })
  return new ApiError({ message: 'Something went wrong', status: 0 })
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/**
 * Apply an API error to a form. Field errors go inline; anything else is returned
 * as a message suitable for a form-level banner (or `null` if fully mapped).
 */
export function handleFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string | null {
  if (error instanceof ApiError && error.fieldErrors.length > 0) {
    const unmapped = applyFieldErrors(error, setError, knownFields)
    return unmapped.length > 0 ? unmapped.join(' ') : null
  }
  return getErrorMessage(error)
}

/**
 * Map backend `fieldErrors` onto React Hook Form fields.
 * Returns the messages that could not be mapped to a known field.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string[] {
  if (!(error instanceof ApiError)) return []
  const unmapped: string[] = []
  for (const fe of error.fieldErrors) {
    if (knownFields.includes(fe.field)) {
      setError(fe.field as FieldPath<T>, { type: 'server', message: fe.message })
    } else {
      unmapped.push(fe.message)
    }
  }
  return unmapped
}
