import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

const BasicInfoStep = ({ data, onUpdate, onNext, categories = [] }) => {
  const [errors, setErrors] = React.useState({});
  const [deadline, setDeadline] = React.useState(data.deadline ? new Date(data.deadline) : null);

  const validateForm = () => {
    const newErrors = {};
    
    if (!data.title || data.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    
    if (!data.goal_amount || data.goal_amount < 100) {
      newErrors.goal_amount = 'Minimum goal amount is $100';
    }
    
    if (data.goal_amount > 1000000) {
      newErrors.goal_amount = 'Maximum goal amount is $1,000,000';
    }
    
    if (!data.category_id) {
      newErrors.category_id = 'Please select a category';
    }
    
    if (!deadline) {
      newErrors.deadline = 'Please select a deadline';
    } else {
      const minDeadline = new Date();
      minDeadline.setDate(minDeadline.getDate() + 7);
      const maxDeadline = new Date();
      maxDeadline.setFullYear(maxDeadline.getFullYear() + 1);
      
      if (deadline < minDeadline) {
        newErrors.deadline = 'Deadline must be at least 7 days from now';
      }
      if (deadline > maxDeadline) {
        newErrors.deadline = 'Deadline cannot be more than 1 year from now';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onUpdate({ ...data, deadline: deadline?.toISOString() });
      onNext();
    }
  };

  const handleDeadlineSelect = (date) => {
    setDeadline(date);
    onUpdate({ ...data, deadline: date?.toISOString() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Campaign Information</CardTitle>
        <CardDescription>
          Let's start with the essential details of your campaign
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Campaign Title*</Label>
          <Input
            id="title"
            value={data.title || ''}
            onChange={(e) => onUpdate({ ...data, title: e.target.value })}
            placeholder="Enter a compelling title for your campaign"
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Make it clear, specific, and inspiring
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal_amount">Fundraising Goal*</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="goal_amount"
              type="number"
              min="100"
              max="1000000"
              value={data.goal_amount || ''}
              onChange={(e) => onUpdate({ ...data, goal_amount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className={cn("pl-8", errors.goal_amount ? 'border-destructive' : '')}
            />
          </div>
          {errors.goal_amount && (
            <p className="text-sm text-destructive">{errors.goal_amount}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Minimum: $100 | Maximum: $1,000,000
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category*</Label>
          <Select
            value={data.category_id || ''}
            onValueChange={(value) => onUpdate({ ...data, category_id: value })}
          >
            <SelectTrigger className={errors.category_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    {category.icon_name && (
                      <span className="text-base">{category.icon_name}</span>
                    )}
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <p className="text-sm text-destructive">{errors.category_id}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Campaign Deadline*</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !deadline && "text-muted-foreground",
                  errors.deadline && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={deadline}
                onSelect={handleDeadlineSelect}
                disabled={(date) => {
                  const minDate = new Date();
                  minDate.setDate(minDate.getDate() + 6);
                  const maxDate = new Date();
                  maxDate.setFullYear(maxDate.getFullYear() + 1);
                  return date < minDate || date > maxDate;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.deadline && (
            <p className="text-sm text-destructive">{errors.deadline}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Must be between 7 days and 1 year from today
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (Optional)</Label>
          <Input
            id="tags"
            value={data.tags?.join(', ') || ''}
            onChange={(e) => onUpdate({ 
              ...data, 
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) 
            })}
            placeholder="e.g., medical, emergency, education"
          />
          <p className="text-sm text-muted-foreground">
            Separate tags with commas to help people find your campaign
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <div className="flex gap-2">
            <InfoCircledIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Campaign Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>You must be verified to create a campaign</li>
                <li>Maximum 3 active campaigns per user</li>
                <li>All campaigns are reviewed before going live</li>
                <li>Funds are held in escrow until milestones are met</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleNext}>Next Step</Button>
      </CardFooter>
    </Card>
  );
};

export default BasicInfoStep;