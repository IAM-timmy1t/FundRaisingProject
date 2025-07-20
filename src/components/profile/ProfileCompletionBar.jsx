import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ProfileCompletionBar = ({ 
  profile, 
  onCompleteProfile,
  showDetails = true 
}) => {
  const calculateCompletion = () => {
    const fields = [
      { key: 'display_name', label: 'Display Name', required: true },
      { key: 'country_iso', label: 'Country', required: true },
      { key: 'date_of_birth', label: 'Date of Birth', required: true },
      { key: 'phone_number', label: 'Phone Number', required: true },
      { key: 'preferred_language', label: 'Preferred Language', required: false },
      { key: 'bio', label: 'Bio', required: false, path: 'metadata.bio' },
      { key: 'avatar', label: 'Profile Photo', required: false, path: 'metadata.avatarUrl' }
    ];

    const completed = fields.filter(field => {
      if (field.path) {
        // Handle nested fields
        const keys = field.path.split('.');
        let value = profile;
        for (const key of keys) {
          value = value?.[key];
        }
        return !!value;
      }
      return !!profile[field.key];
    });

    const requiredCompleted = completed.filter(f => 
      fields.find(field => field.key === f.key)?.required
    ).length;

    const requiredTotal = fields.filter(f => f.required).length;

    return {
      percentage: Math.round((completed.length / fields.length) * 100),
      completed: completed.length,
      total: fields.length,
      requiredCompleted,
      requiredTotal,
      missingFields: fields.filter(field => {
        if (field.path) {
          const keys = field.path.split('.');
          let value = profile;
          for (const key of keys) {
            value = value?.[key];
          }
          return !value;
        }
        return !profile[field.key];
      })
    };
  };

  const completion = calculateCompletion();
  const isComplete = completion.percentage === 100;

  if (!showDetails) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Profile Completion</span>
          <span className="font-medium">{completion.percentage}%</span>
        </div>
        <Progress value={completion.percentage} className="h-2" />
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Profile Completion</h3>
          <span className={cn(
            "text-2xl font-bold",
            isComplete ? "text-green-600" : "text-orange-600"
          )}>
            {completion.percentage}%
          </span>
        </div>

        <Progress 
          value={completion.percentage} 
          className="h-3"
        />

        <div className="text-sm text-muted-foreground">
          {completion.completed} of {completion.total} fields completed
          {completion.requiredCompleted < completion.requiredTotal && (
            <span className="text-orange-600 ml-1">
              ({completion.requiredTotal - completion.requiredCompleted} required fields missing)
            </span>
          )}
        </div>

        {!isComplete && completion.missingFields.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Complete your profile:</p>
            <ul className="space-y-1">
              {completion.missingFields.slice(0, 3).map((field) => (
                <li key={field.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Circle className="w-3 h-3" />
                  <span>
                    Add your {field.label}
                    {field.required && <span className="text-orange-600 ml-1">*</span>}
                  </span>
                </li>
              ))}
              {completion.missingFields.length > 3 && (
                <li className="text-sm text-muted-foreground italic">
                  and {completion.missingFields.length - 3} more...
                </li>
              )}
            </ul>
          </div>
        )}

        {!isComplete && onCompleteProfile && (
          <Button 
            onClick={onCompleteProfile}
            className="w-full"
            size="sm"
          >
            Complete Profile
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {isComplete && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Your profile is complete!
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProfileCompletionBar;