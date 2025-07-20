import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlusIcon, TrashIcon, AlertCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const BudgetBreakdownStep = ({ data, onUpdate, onNext, onBack }) => {
  const [errors, setErrors] = React.useState({});
  const [budgetItems, setBudgetItems] = React.useState(
    data.budget_breakdown || [
      { id: 1, category: '', description: '', amount: 0 }
    ]
  );
  const [beneficiaries, setBeneficiaries] = React.useState(
    data.beneficiaries || [
      { id: 1, name: '', relationship: '', percentage: 100 }
    ]
  );

  const totalBudget = budgetItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const goalAmount = data.goal_amount || 0;
  const budgetDifference = goalAmount - totalBudget;
  const budgetProgress = goalAmount > 0 ? (totalBudget / goalAmount) * 100 : 0;

  const totalBeneficiaryPercentage = beneficiaries.reduce(
    (sum, b) => sum + (parseFloat(b.percentage) || 0), 
    0
  );

  const validateForm = () => {
    const newErrors = {};
    
    // Validate budget items
    if (budgetItems.length === 0) {
      newErrors.budget = 'At least one budget item is required';
    }
    
    const invalidBudgetItems = budgetItems.filter(
      item => !item.category || !item.description || !item.amount || item.amount <= 0
    );
    
    if (invalidBudgetItems.length > 0) {
      newErrors.budget = 'All budget items must have category, description, and amount';
    }
    
    if (Math.abs(budgetDifference) > 0.01) {
      newErrors.budgetTotal = `Budget total must equal goal amount ($${goalAmount})`;
    }
    
    // Validate beneficiaries
    const invalidBeneficiaries = beneficiaries.filter(
      b => !b.name || !b.relationship || !b.percentage || b.percentage <= 0
    );
    
    if (invalidBeneficiaries.length > 0) {
      newErrors.beneficiaries = 'All beneficiaries must have name, relationship, and percentage';
    }
    
    if (Math.abs(totalBeneficiaryPercentage - 100) > 0.01) {
      newErrors.beneficiaryTotal = 'Beneficiary percentages must total 100%';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onUpdate({ 
        ...data, 
        budget_breakdown: budgetItems,
        beneficiaries: beneficiaries
      });
      onNext();
    }
  };

  // Budget Item Management
  const addBudgetItem = () => {
    setBudgetItems([
      ...budgetItems,
      { id: Date.now(), category: '', description: '', amount: 0 }
    ]);
  };

  const updateBudgetItem = (id, field, value) => {
    setBudgetItems(budgetItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeBudgetItem = (id) => {
    if (budgetItems.length > 1) {
      setBudgetItems(budgetItems.filter(item => item.id !== id));
    }
  };

  // Beneficiary Management
  const addBeneficiary = () => {
    setBeneficiaries([
      ...beneficiaries,
      { id: Date.now(), name: '', relationship: '', percentage: 0 }
    ]);
  };

  const updateBeneficiary = (id, field, value) => {
    setBeneficiaries(beneficiaries.map(b =>
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const removeBeneficiary = (id) => {
    if (beneficiaries.length > 1) {
      setBeneficiaries(beneficiaries.filter(b => b.id !== id));
    }
  };

  const budgetCategories = [
    'Medical Expenses',
    'Emergency Relief',
    'Education',
    'Housing',
    'Transportation',
    'Food & Essentials',
    'Equipment',
    'Administrative',
    'Other'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget & Beneficiaries</CardTitle>
        <CardDescription>
          Break down how the funds will be used and who will benefit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Budget Breakdown*</Label>
            <div className="text-sm">
              <span className={cn(
                "font-medium",
                Math.abs(budgetDifference) < 0.01 ? "text-green-600" : "text-amber-600"
              )}>
                ${totalBudget.toFixed(2)}
              </span>
              <span className="text-muted-foreground"> / ${goalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <Progress 
            value={budgetProgress} 
            className={cn(
              "h-2",
              budgetProgress > 100 && "[&>div]:bg-amber-500"
            )} 
          />
          
          {errors.budgetTotal && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <span>{errors.budgetTotal}</span>
            </div>
          )}

          <div className="space-y-3">
            {budgetItems.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium">Item {index + 1}</span>
                  {budgetItems.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => removeBudgetItem(item.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <select
                      value={item.category}
                      onChange={(e) => updateBudgetItem(item.id, 'category', e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select category</option>
                      {budgetCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount || ''}
                        onChange={(e) => updateBudgetItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-3">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                      placeholder="Explain what this expense covers..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {errors.budget && (
            <p className="text-sm text-destructive">{errors.budget}</p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBudgetItem}
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Budget Item
          </Button>
        </div>

        {/* Beneficiaries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Beneficiaries*</Label>
            <div className="text-sm">
              <span className={cn(
                "font-medium",
                totalBeneficiaryPercentage === 100 ? "text-green-600" : "text-amber-600"
              )}>
                {totalBeneficiaryPercentage}%
              </span>
              <span className="text-muted-foreground"> allocated</span>
            </div>
          </div>

          {errors.beneficiaryTotal && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <span>{errors.beneficiaryTotal}</span>
            </div>
          )}

          <div className="space-y-3">
            {beneficiaries.map((beneficiary, index) => (
              <div key={beneficiary.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium">Beneficiary {index + 1}</span>
                  {beneficiaries.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => removeBeneficiary(beneficiary.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={beneficiary.name}
                      onChange={(e) => updateBeneficiary(beneficiary.id, 'name', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Relationship</Label>
                    <Input
                      value={beneficiary.relationship}
                      onChange={(e) => updateBeneficiary(beneficiary.id, 'relationship', e.target.value)}
                      placeholder="e.g., Self, Child, Friend"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Percentage</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={beneficiary.percentage || ''}
                        onChange={(e) => updateBeneficiary(beneficiary.id, 'percentage', parseFloat(e.target.value) || 0)}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {errors.beneficiaries && (
            <p className="text-sm text-destructive">{errors.beneficiaries}</p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBeneficiary}
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Beneficiary
          </Button>
        </div>

        <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
          <div className="flex gap-2">
            <AlertCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>Budget breakdown must equal your goal amount exactly</li>
                <li>Be specific about how funds will be used</li>
                <li>Beneficiary percentages must total 100%</li>
                <li>All funds are held in escrow until milestones are met</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Previous</Button>
        <Button onClick={handleNext}>Next Step</Button>
      </CardFooter>
    </Card>
  );
};

export default BudgetBreakdownStep;