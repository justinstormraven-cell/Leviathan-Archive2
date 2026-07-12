import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'warning' | 'destructive';
}

export function TerminalCard({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "border bg-card text-card-foreground p-4 relative overflow-hidden",
        {
          'border-border': variant === 'default',
          'border-primary/50 shadow-[0_0_15px_rgba(0,255,255,0.1)]': variant === 'primary',
          'border-warning/50 shadow-[0_0_15px_rgba(255,153,0,0.1)]': variant === 'warning',
          'border-destructive/50 shadow-[0_0_15px_rgba(255,0,0,0.1)]': variant === 'destructive',
        },
        className
      )}
      {...props}
    >
      <div className={cn(
        "absolute top-0 left-0 w-full h-[1px] opacity-50",
        {
          'bg-gradient-to-r from-transparent via-border to-transparent': variant === 'default',
          'bg-gradient-to-r from-transparent via-primary to-transparent': variant === 'primary',
          'bg-gradient-to-r from-transparent via-warning to-transparent': variant === 'warning',
          'bg-gradient-to-r from-transparent via-destructive to-transparent': variant === 'destructive',
        }
      )} />
      {children}
    </div>
  );
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'online' | 'offline' | 'degraded' | 'critical' | 'info' | 'warn' | 'success';
}

export function StatusBadge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-semibold border tracking-wider uppercase",
        {
          'bg-secondary text-secondary-foreground border-border': variant === 'default',
          'bg-primary/10 text-primary border-primary/30': variant === 'online' || variant === 'info',
          'bg-slate-800 text-slate-300 border-slate-600': variant === 'offline',
          'bg-warning/10 text-warning border-warning/30': variant === 'degraded' || variant === 'warn',
          'bg-destructive/10 text-destructive border-destructive/30': variant === 'critical',
          'bg-success/10 text-success border-success/30': variant === 'success',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
