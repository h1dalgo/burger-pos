'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  dark?: boolean;
}

export function TextField({
  label,
  hint,
  error,
  dark = false,
  className,
  id,
  ...props
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'mb-1.5 block text-sm font-semibold',
            dark ? 'text-white/70' : 'text-carbon/70'
          )}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn('field', dark && 'field-dark', className)}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-rose">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className={cn('mt-1.5 text-xs', dark ? 'text-white/40' : 'text-carbon/50')}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
