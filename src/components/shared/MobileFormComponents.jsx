import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formFieldClasses, touchClasses } from '@/utils/mobileOptimizations';

/**
 * Mobile-optimized input component with proper touch targets
 */
export const MobileInput = React.forwardRef(({ 
  className, 
  label, 
  error, 
  touched,
  helperText,
  ...props 
}, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor={props.id || props.name} 
          className="text-sm font-medium"
        >
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Input
        ref={ref}
        className={cn(
          formFieldClasses.input,
          "w-full",
          error && touched && "border-destructive",
          className
        )}
        {...props}
      />
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && touched && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
});

MobileInput.displayName = 'MobileInput';

/**
 * Mobile-optimized textarea component
 */
export const MobileTextarea = React.forwardRef(({ 
  className, 
  label, 
  error, 
  touched,
  helperText,
  ...props 
}, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor={props.id || props.name} 
          className="text-sm font-medium"
        >
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Textarea
        ref={ref}
        className={cn(
          formFieldClasses.textarea,
          "w-full resize-none",
          error && touched && "border-destructive",
          className
        )}
        {...props}
      />
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && touched && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
});

MobileTextarea.displayName = 'MobileTextarea';

/**
 * Mobile-optimized select component
 */
export const MobileSelect = React.forwardRef(({ 
  className, 
  label, 
  error, 
  touched,
  helperText,
  options = [],
  placeholder = "Select an option",
  ...props 
}, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor={props.id || props.name} 
          className="text-sm font-medium"
        >
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select {...props}>
        <SelectTrigger 
          ref={ref}
          className={cn(
            formFieldClasses.select,
            "w-full",
            error && touched && "border-destructive",
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="min-h-[44px] flex items-center"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && touched && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
});

MobileSelect.displayName = 'MobileSelect';

/**
 * Mobile-optimized button component
 */
export const MobileButton = React.forwardRef(({ 
  className, 
  size = 'md',
  fullWidth = false,
  children,
  ...props 
}, ref) => {
  return (
    <Button
      ref={ref}
      className={cn(
        touchClasses.button[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
});

MobileButton.displayName = 'MobileButton';

/**
 * Mobile-optimized form container
 */
export const MobileForm = ({ 
  children, 
  className,
  onSubmit,
  ...props 
}) => {
  return (
    <form 
      onSubmit={onSubmit}
      className={cn(
        "space-y-4",
        className
      )}
      {...props}
    >
      {children}
    </form>
  );
};

export default {
  MobileInput,
  MobileTextarea,
  MobileSelect,
  MobileButton,
  MobileForm
};