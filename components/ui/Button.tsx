import { cn } from '@/lib/utils/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles = 'font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
    
    const variants = {
      primary: 'bg-gold text-game-bg hover:bg-yellow-500 shadow-lg shadow-gold/30',
      secondary: 'bg-game-card border-2 border-game-border hover:border-gold/50 text-white',
      danger: 'bg-red-win hover:bg-red-600 text-white shadow-lg shadow-red-500/30',
      ghost: 'bg-transparent hover:bg-white/10 text-white',
    }
    
    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? <div className="spinner w-5 h-5 border-2" /> : children}
      </button>
    )
  }
)

Button.displayName = 'Button'