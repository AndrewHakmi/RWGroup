import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary-hover hover:shadow-md active:bg-primary-hover',
        destructive: 'bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md',
        outline: 'border border-primary text-primary bg-transparent shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 hover:shadow-md',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover hover:shadow-md',
        accent: 'bg-accent text-accent-foreground shadow-sm hover:bg-accent-hover hover:shadow-md',
        ghost: 'hover:bg-surface text-foreground hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary-hover',
        dark: 'bg-surface text-white shadow hover:bg-surface-alt hover:shadow-lg hover:-translate-y-0.5',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, icon, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
export default Button
