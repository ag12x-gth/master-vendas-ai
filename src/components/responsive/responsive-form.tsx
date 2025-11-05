'use client';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

export function ResponsiveFormField({
  label,
  children,
  error,
  required,
  className
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm sm:text-base">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs sm:text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function ResponsiveInput({
  label,
  error,
  className,
  ...props
}: ResponsiveInputProps) {
  const input = (
    <Input
      className={cn(
        'w-full text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4',
        error && 'border-destructive',
        className
      )}
      {...props}
    />
  );

  if (label) {
    return (
      <ResponsiveFormField label={label} error={error} required={props.required}>
        {input}
      </ResponsiveFormField>
    );
  }

  return input;
}

interface ResponsiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function ResponsiveTextarea({
  label,
  error,
  className,
  ...props
}: ResponsiveTextareaProps) {
  const textarea = (
    <Textarea
      className={cn(
        'w-full text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 min-h-[100px] sm:min-h-[120px]',
        error && 'border-destructive',
        className
      )}
      {...props}
    />
  );

  if (label) {
    return (
      <ResponsiveFormField label={label} error={error} required={props.required}>
        {textarea}
      </ResponsiveFormField>
    );
  }

  return textarea;
}

interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
}

export function ResponsiveButtonGroup({
  children,
  className,
  vertical = false
}: ResponsiveButtonGroupProps) {
  const { isMobile } = useResponsive();

  return (
    <div className={cn(
      'flex gap-2 sm:gap-3',
      (vertical || isMobile) ? 'flex-col' : 'flex-row',
      className
    )}>
      {children}
    </div>
  );
}
