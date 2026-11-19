import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({
  size = 'md',
  iconOnly = false,
  className,
}: {
  size?: 'md' | 'lg'
  iconOnly?: boolean
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-2.5 font-extrabold tracking-tight', className)}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25',
          size === 'lg' ? 'size-10' : 'size-8',
        )}
      >
        <Check className={size === 'lg' ? 'size-6' : 'size-5'} strokeWidth={3} aria-hidden />
      </span>
      {!iconOnly && (
        <span className={cn('tracking-tight lowercase', size === 'lg' ? 'text-2xl' : 'text-lg')}>
          taskflow
        </span>
      )}
    </span>
  )
}
