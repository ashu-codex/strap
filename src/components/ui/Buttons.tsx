'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

/**
 * STRAP Primary Action Button
 * Background: #B7F34A | Hover: #A7E438 | Text: #111318 | Radius: 10px | Weight: 700
 */
export function PrimaryButton({
  children,
  loading = false,
  icon,
  fullWidth = false,
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-6 py-3 text-sm',
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-bold transition-all duration-150
        rounded-[10px] bg-[#B7F34A] text-[#111318] hover:bg-[#A7E438] active:scale-[0.98]
        shadow-[0_0_20px_-5px_rgba(183,243,74,0.35)] hover:shadow-[0_0_25px_-3px_rgba(183,243,74,0.45)]
        focus:outline-none focus:ring-2 focus:ring-[#B7F34A] focus:ring-offset-2 focus:ring-offset-[#101114]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#B7F34A] disabled:shadow-none disabled:active:scale-100
        ${sizeClasses}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-[#111318]" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

/**
 * STRAP Secondary Button (Subtle surface / border)
 */
export function SecondaryButton({
  children,
  loading = false,
  icon,
  fullWidth = false,
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-6 py-3 text-sm',
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150
        rounded-[10px] border border-[#30333A] bg-[#1B1D22] text-[#F5F5F5]
        hover:bg-[#252830] hover:border-[#424650] hover:text-white active:scale-[0.98]
        dark:border-[#30333A] dark:bg-[#1B1D22] dark:text-[#F5F5F5]
        light:border-[#E1E4E8] light:bg-[#FFFFFF] light:text-[#111318] light:hover:bg-[#F5F6F8]
        focus:outline-none focus:ring-2 focus:ring-[#B7F34A]/50 focus:ring-offset-2 focus:ring-offset-[#101114]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${sizeClasses}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-current" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

/**
 * STRAP Destructive Button (Delete, Reject, Cancel)
 */
export function DestructiveButton({
  children,
  loading = false,
  icon,
  fullWidth = false,
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-6 py-3 text-sm',
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-bold transition-all duration-150
        rounded-[10px] border border-red-500/40 bg-red-950/80 text-red-200
        hover:bg-red-900 hover:border-red-500/80 hover:text-white active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#101114]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${sizeClasses}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-red-200" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

/**
 * STRAP Icon Button (Square action icon)
 */
export function IconButton({
  children,
  title,
  variant = 'secondary',
  className = '',
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const variantClasses = {
    primary: 'bg-[#B7F34A] text-[#111318] hover:bg-[#A7E438]',
    secondary: 'border border-[#30333A] bg-[#1B1D22] text-[#F5F5F5] hover:bg-[#252830]',
    ghost: 'text-[#9496A1] hover:text-white hover:bg-[#1B1D22]',
  }[variant];

  return (
    <button
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center h-9 w-9 rounded-[10px] transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-[#B7F34A]/50 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * STRAP Loading Button
 */
export function LoadingButton({
  loading,
  children,
  ...props
}: ButtonProps) {
  return (
    <PrimaryButton loading={loading} {...props}>
      {children}
    </PrimaryButton>
  );
}
