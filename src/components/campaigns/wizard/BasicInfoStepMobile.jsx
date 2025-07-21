import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import TouchOptimizedDatePicker from '@/components/shared/TouchOptimizedDatePicker';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const BasicInfoStepMobile = ({ data, onUpdate, onNext, categories = [] }) => {
  const [errors, setErrors] = useState({});
  const [deadline, setDeadline] = useState(data.deadline ? new Date(data.deadline) : null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [touched, setTouched] = useState({});

  // Auto-save functionality
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (Object.keys(touched).length > 0) {
        // Auto-save logic here if needed
        console.log('Auto-saving form data...');
      }
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [data, touched]);

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
      onUpdate({ ...data, deadline });
      onNext();
    }
  };

  const handleFieldChange = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    onUpdate({ ...data, [field]: value });
  };

  const handleDeadlineChange = (date) => {
    setDeadline(date);
    setTouched(prev => ({ ...prev, deadline: true }));
  };

  const inputAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };

  return (
    <Card className={cn(
      "shadow-lg border-0",
      isMobile && "rounded-none"
    )}>
      <CardHeader className={cn(
        "bg-gradient-to-r from-primary/10 to-primary/5",
        isMobile ? "p-4" : "p-6"
      )}>
        <CardTitle className={cn(
          "flex items-center gap-2",
          isMobile ? "text-lg" : "text-2xl"
        )}>
          Basic Campaign Information
        </CardTitle>
        {!isMobile && (
          <CardDescription>
            Let's start with the essential details of your campaign
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className={cn(
        "space-y-6",
        isMobile ? "p-4" : "p-6"
      )}>
        <motion.div {...inputAnimation} className="space-y-2">
          <Label htmlFor="title" className="flex items-center gap-1">
            Campaign Title*
            {errors.title && touched.title && (
              <AlertCircle className="h-3 w-3 text-destructive" />
            )}
          </Label>
          <Input
            id="title"
            value={data.title || ''}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="e.g., Help John's Medical Treatment"
            className={cn(
              "transition-all",
              isMobile && "text-base py-6",
              errors.title && touched.title ? 'border-destructive' : '',
              touched.title && !errors.title ? 'border-green-500' : ''
            )}
            maxLength={100}
          />
          {errors.title && touched.title && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.title}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {data.title?.length || 0}/100 characters
          </p>
        </motion.div>

        <motion.div {...inputAnimation} className="space-y-2">
          <Label htmlFor="goal_amount" className="flex items-center gap-1">
            Fundraising Goal*
            {errors.goal_amount && touched.goal_amount && (
              <AlertCircle className="h-3 w-3 text-destructive" />
            )}
          </Label>
          <div className="relative">
            <span className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
              isMobile && "text-lg"
            )}>
              $
            </span>
            <Input
              id="goal_amount"
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              min="100"
              max="1000000"
              value={data.goal_amount || ''}
              onChange={(e) => handleFieldChange('goal_amount', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={cn(
                "pl-8 transition-all",
                isMobile && "text-lg py-6",
                errors.goal_amount && touched.goal_amount ? 'border-destructive' : '',
                touched.goal_amount && !errors.goal_amount ? 'border-green-500' : ''
              )}
            />
          </div>
          {errors.goal_amount && touched.goal_amount && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.goal_amount}
            </p>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Minimum: $100</span>
            <span>Maximum: $1,000,000</span>
          </div>
        </motion.div>

        <motion.div {...inputAnimation} className="space-y-2">
          <Label htmlFor="category" className="flex items-center gap-1">
            Category*
            {errors.category_id && touched.category_id && (
              <AlertCircle className="h-3 w-3 text-destructive" />
            )}
          </Label>
          <Select
            value={data.category_id || ''}
            onValueChange={(value) => handleFieldChange('category_id', value)}
          >
            <SelectTrigger className={cn(
              "transition-all",
              isMobile && "py-6 text-base",
              errors.category_id && touched.category_id ? 'border-destructive' : '',
              touched.category_id && data.category_id ? 'border-green-500' : ''
            )}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent className={isMobile ? "max-h-[300px]" : ""}>
              {categories.map((category) => (
                <SelectItem 
                  key={category.id} 
                  value={category.id}
                  className={isMobile ? "py-3" : ""}
                >
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
          {errors.category_id && touched.category_id && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.category_id}
            </p>
          )}
        </motion.div>

        <motion.div {...inputAnimation} className="space-y-2">
          <Label htmlFor="deadline" className="flex items-center gap-1">
            Campaign Deadline*
            {errors.deadline && touched.deadline && (
              <AlertCircle className="h-3 w-3 text-destructive" />
            )}
          </Label>
          <TouchOptimizedDatePicker
            date={deadline}
            onDateChange={handleDeadlineChange}
            placeholder="Select campaign end date"
            minDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
            maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
            className={cn(
              "transition-all",
              isMobile && "py-6 text-base",
              errors.deadline && touched.deadline ? 'border-destructive' : '',
              touched.deadline && deadline ? 'border-green-500' : ''
            )}
          />
          {errors.deadline && touched.deadline && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.deadline}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Must be between 7 days and 1 year from today
          </p>
        </motion.div>

        <motion.div {...inputAnimation} className="space-y-2">
          <Label htmlFor="tags">Tags (Optional)</Label>
          <Input
            id="tags"
            value={data.tags?.join(', ') || ''}
            onChange={(e) => handleFieldChange(
              'tags',
              e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            )}
            placeholder="e.g., medical, emergency, education"
            className={cn(
              "transition-all",
              isMobile && "text-base py-6"
            )}
          />
          <p className="text-sm text-muted-foreground">
            Separate tags with commas to help people find your campaign
          </p>
        </motion.div>

        {isMobile && (
          <motion.div 
            {...inputAnimation}
            className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex gap-2">
              <InfoCircledIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Quick Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Clear, specific titles get more attention</li>
                  <li>Set realistic funding goals</li>
                  <li>All campaigns are reviewed within 24 hours</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {!isMobile && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-2">
              <InfoCircledIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Campaign Requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>You must be verified to create a campaign</li>
                  <li>Maximum 3 active campaigns per user</li>
                  <li>All campaigns are reviewed before going live</li>
                  <li>Funds are held in escrow until milestones are met</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {!isMobile && (
        <CardFooter className="flex justify-end bg-muted/50 p-6">
          <Button 
            onClick={handleNext} 
            size="lg"
            className="min-w-[120px]"
          >
            Next Step
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default BasicInfoStepMobile;