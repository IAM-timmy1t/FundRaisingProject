import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Touch-optimized date picker that uses drawer on mobile and popover on desktop
 */
const TouchOptimizedDatePicker = ({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  minDate,
  maxDate,
  disabled = false,
  className = '',
  formatStr = 'PPP',
  ...props
}) => {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleDateSelect = (newDate) => {
    onDateChange(newDate);
    setOpen(false);
  };

  const TriggerButton = (
    <Button
      variant="outline"
      className={cn(
        'w-full justify-start text-left font-normal',
        !date && 'text-muted-foreground',
        className
      )}
      disabled={disabled}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, formatStr) : placeholder}
    </Button>
  );

  const CalendarComponent = (
    <Calendar
      mode="single"
      selected={date}
      onSelect={handleDateSelect}
      disabled={(date) => {
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
      }}
      initialFocus
      {...props}
    />
  );

  // Use drawer on mobile for better touch experience
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select Date</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            {CalendarComponent}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => {
                  if (!date) handleDateSelect(new Date());
                  else setOpen(false);
                }}
              >
                {date ? 'Done' : 'Today'}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Use popover on desktop
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {CalendarComponent}
      </PopoverContent>
    </Popover>
  );
};

export default TouchOptimizedDatePicker;