import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { touchClasses, formFieldClasses } from '@/utils/mobileOptimizations';

/**
 * Mobile-optimized form field components
 * Ensures proper touch targets and spacing for mobile devices
 */

export const MobileInput = React.forwardRef(({ className, error, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      formFieldClasses.input,
      error && "border-destructive",
      className
    )}
    {...props}
  />
));
MobileInput.displayName = "MobileInput";

export const MobileTextarea = React.forwardRef(({ className, error, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={cn(
      formFieldClasses.textarea,
      error && "border-destructive",
      className
    )}
    {...props}
  />
));
MobileTextarea.displayName = "MobileTextarea";

export const MobileSelect = React.forwardRef(({ children, className, error, ...props }, ref) => (
  <Select {...props}>
    <SelectTrigger
      ref={ref}
      className={cn(
        formFieldClasses.select,
        error && "border-destructive",
        className
      )}
    >
      {children}
    </SelectTrigger>
  </Select>
));
MobileSelect.displayName = "MobileSelect";

export const MobileLabel = ({ className, required, children, ...props }) => (
  <Label
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      "mb-2", // Add spacing for better touch targets
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="text-destructive ml-1">*</span>}
  </Label>
);

export const MobileFormField = ({
  label,
  error,
  helperText,
  required,
  children,
  className
}) => (
  <div className={cn("space-y-2", className)}>
    {label && (
      <MobileLabel required={required}>
        {label}
      </MobileLabel>
    )}
    {children}
    {error && (
      <p className="text-sm text-destructive mt-1">{error}</p>
    )}
    {helperText && !error && (
      <p className="text-sm text-muted-foreground mt-1">{helperText}</p>
    )}
  </div>
);

/**
 * Touch-friendly checkbox component
 */
export const MobileCheckbox = React.forwardRef(({ className, label, ...props }, ref) => (
  <label className="flex items-center space-x-3 cursor-pointer p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors">
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        formFieldClasses.checkbox,
        "rounded border-gray-300 text-primary focus:ring-primary",
        className
      )}
      {...props}
    />
    {label && (
      <span className="text-sm font-medium select-none">{label}</span>
    )}
  </label>
));
MobileCheckbox.displayName = "MobileCheckbox";

/**
 * Touch-friendly radio button component
 */
export const MobileRadio = React.forwardRef(({ className, label, ...props }, ref) => (
  <label className="flex items-center space-x-3 cursor-pointer p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors">
    <input
      ref={ref}
      type="radio"
      className={cn(
        formFieldClasses.radio,
        "border-gray-300 text-primary focus:ring-primary",
        className
      )}
      {...props}
    />
    {label && (
      <span className="text-sm font-medium select-none">{label}</span>
    )}
  </label>
));
MobileRadio.displayName = "MobileRadio";

/**
 * Touch-friendly button group for mobile forms
 */
export const MobileButtonGroup = ({ children, className }) => (
  <div className={cn(
    "flex flex-col sm:flex-row gap-3 sm:gap-4",
    "w-full sm:w-auto",
    className
  )}>
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          className: cn(
            touchClasses.button.md,
            "w-full sm:w-auto",
            child.props.className
          )
        });
      }
      return child;
    })}
  </div>
);

/**
 * Mobile-optimized form section with proper spacing
 */
export const MobileFormSection = ({ title, description, children, className }) => (
  <div className={cn("space-y-4 sm:space-y-6", className)}>
    {(title || description) && (
      <div className="space-y-1">
        {title && (
          <h3 className="text-lg font-medium">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    )}
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export default {
  MobileInput,
  MobileTextarea,
  MobileSelect,
  MobileLabel,
  MobileFormField,
  MobileCheckbox,
  MobileRadio,
  MobileButtonGroup,
  MobileFormSection
};
