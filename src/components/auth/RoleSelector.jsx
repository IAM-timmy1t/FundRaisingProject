import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Heart, User, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';

/**
 * RoleSelector Component
 * Used during registration to select user role
 */
const RoleSelector = ({ value, onChange, includeAdmin = false }) => {
  const roles = [
    {
      value: 'donor',
      label: 'Donor',
      description: 'Support campaigns and make donations',
      icon: Heart,
      color: 'text-blue-500'
    },
    {
      value: 'recipient',
      label: 'Campaign Creator',
      description: 'Create campaigns and receive support',
      icon: User,
      color: 'text-green-500'
    }
  ];

  if (includeAdmin) {
    roles.push({
      value: 'admin',
      label: 'Administrator',
      description: 'Manage platform and moderate content',
      icon: Shield,
      color: 'text-purple-500'
    });
  }

  return (
    <RadioGroup value={value} onValueChange={onChange}>
      <div className="space-y-2">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card key={role.value} className="p-4 cursor-pointer hover:bg-accent transition-colors">
              <Label 
                htmlFor={role.value} 
                className="flex items-start gap-3 cursor-pointer"
              >
                <RadioGroupItem value={role.value} id={role.value} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-5 h-5 ${role.color}`} />
                    <span className="font-medium">{role.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </Label>
            </Card>
          );
        })}
      </div>
    </RadioGroup>
  );
};

export default RoleSelector;