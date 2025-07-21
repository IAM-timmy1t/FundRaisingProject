import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlusIcon, TrashIcon, AlertCircleIcon, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { motion } from 'framer-motion';
import { InfoCircledIcon } from '@radix-ui/react-icons';

const BudgetBreakdownStepMobile = ({ data, onUpdate, onNext, onBack }) => {
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});
  const [expandedItems, setExpandedItems] = React.useState({});
  const isMobile = useMediaQuery('(max-width: 768px)');
  
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

  // Auto-save functionality
  React.useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (Object.keys(touched).length > 0) {
        console.log('Auto-saving budget data...');
      }
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [budgetItems, beneficiaries, touched]);

  const validateForm = () => {
    const newErrors = {};
    
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
      newErrors.budgetTotal = `Budget must equal goal ($${goalAmount})`;
    }
    
    const invalidBeneficiaries = beneficiaries.filter(
      b => !b.name || !b.relationship || !b.percentage || b.percentage <= 0
    );
    
    if (invalidBeneficiaries.length > 0) {
      newErrors.beneficiaries = 'All beneficiaries must be complete';
    }
    
    if (Math.abs(totalBeneficiaryPercentage - 100) > 0.01) {
      newErrors.beneficiaryTotal = 'Must total 100%';
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

  const addBudgetItem = () => {
    setBudgetItems([
      ...budgetItems,
      { id: Date.now(), category: '', description: '', amount: 0 }
    ]);
    setTouched(prev => ({ ...prev, budget: true }));
  };

  const updateBudgetItem = (id, field, value) => {
    setBudgetItems(budgetItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
    setTouched(prev => ({ ...prev, [`budget_${id}_${field}`]: true }));
  };

  const removeBudgetItem = (id) => {
    if (budgetItems.length > 1) {
      setBudgetItems(budgetItems.filter(item => item.id !== id));
    }
  };

  const addBeneficiary = () => {
    setBeneficiaries([
      ...beneficiaries,
      { id: Date.now(), name: '', relationship: '', percentage: 0 }
    ]);
    setTouched(prev => ({ ...prev, beneficiaries: true }));
  };

  const updateBeneficiary = (id, field, value) => {
    setBeneficiaries(beneficiaries.map(b =>
      b.id === id ? { ...b, [field]: value } : b
    ));
    setTouched(prev => ({ ...prev, [`beneficiary_${id}_${field}`]: true }));
  };

  const removeBeneficiary = (id) => {
    if (beneficiaries.length > 1) {
      setBeneficiaries(beneficiaries.filter(b => b.id !== id));
    }
  };

  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
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
          Budget & Beneficiaries
        </CardTitle>
        {!isMobile && (
          <CardDescription>
            Break down how the funds will be used and who will benefit
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className={cn(
        "space-y-6",
        isMobile ? "p-4" : "p-6"
      )}>
        {/* Budget Breakdown */}
        <motion.div {...inputAnimation} className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1">
              Budget Breakdown*
              {errors.budget && touched.budget && (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
            </Label>
            <div className="text-sm text-right">
              <span className={cn(
                "font-medium",
                Math.abs(budgetDifference) < 0.01 ? "text-green-600" : "text-amber-600"
              )}>
                ${totalBudget.toFixed(0)}
              </span>
              <span className="text-muted-foreground"> / ${goalAmount.toFixed(0)}</span>
            </div>
          </div>
          
          <Progress 
            value={budgetProgress} 
            className={cn(
              "h-2",
              budgetProgress > 100 && "[&>div]:bg-amber-500",
              budgetProgress === 100 && "[&>div]:bg-green-500"
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
              <motion.div 
                key={item.id} 
                {...inputAnimation}
                className={cn(
                  "border rounded-lg transition-all",
                  isMobile ? "p-3" : "p-4",
                  expandedItems[item.id] && "bg-muted/50"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    {budgetItems.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "p-0",
                          isMobile ? "h-9 w-9" : "h-8 w-8"
                        )}
                        onClick={() => removeBudgetItem(item.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {isMobile ? (
                    // Mobile: Stacked layout
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Category</Label>
                        <select
                          value={item.category}
                          onChange={(e) => updateBudgetItem(item.id, 'category', e.target.value)}
                          className={cn(
                            "w-full px-3 rounded-md border border-input bg-background text-sm",
                            isMobile ? "h-12" : "h-10"
                          )}
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
                          <span className={cn(
                            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
                            isMobile && "text-base"
                          )}>
                            $
                          </span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            pattern="[0-9]*"
                            min="0"
                            step="0.01"
                            value={item.amount || ''}
                            onChange={(e) => updateBudgetItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                            className={cn(
                              "pl-8",
                              isMobile && "text-base py-6"
                            )}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                          placeholder="What this expense covers..."
                          className={cn(
                            isMobile && "text-base"
                          )}
                          rows={2}
                        />
                      </div>
                    </div>
                  ) : (
                    // Desktop: Grid layout
                    <div className="grid grid-cols-3 gap-3">
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
                      
                      <div className="col-span-3">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                          placeholder="Explain what this expense covers..."
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {errors.budget && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.budget}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size={isMobile ? "default" : "sm"}
            onClick={addBudgetItem}
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Budget Item
          </Button>
        </motion.div>

        {/* Beneficiaries */}
        <motion.div {...inputAnimation} className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1">
              Beneficiaries*
              {errors.beneficiaries && touched.beneficiaries && (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
            </Label>
            <div className="text-sm text-right">
              <span className={cn(
                "font-medium",
                totalBeneficiaryPercentage === 100 ? "text-green-600" : "text-amber-600"
              )}>
                {totalBeneficiaryPercentage}%
              </span>
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
              <motion.div 
                key={beneficiary.id} 
                {...inputAnimation}
                className={cn(
                  "border rounded-lg",
                  isMobile ? "p-3" : "p-4"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium">Beneficiary {index + 1}</span>
                    {beneficiaries.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "p-0",
                          isMobile ? "h-9 w-9" : "h-8 w-8"
                        )}
                        onClick={() => removeBeneficiary(beneficiary.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {isMobile ? (
                    // Mobile: Stacked layout
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={beneficiary.name}
                          onChange={(e) => updateBeneficiary(beneficiary.id, 'name', e.target.value)}
                          placeholder="Full name"
                          className={cn(
                            isMobile && "text-base py-6"
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Relationship</Label>
                          <Input
                            value={beneficiary.relationship}
                            onChange={(e) => updateBeneficiary(beneficiary.id, 'relationship', e.target.value)}
                            placeholder="e.g., Self"
                            className={cn(
                              isMobile && "text-base py-6"
                            )}
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Percentage</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              inputMode="decimal"
                              pattern="[0-9]*"
                              min="0"
                              max="100"
                              value={beneficiary.percentage || ''}
                              onChange={(e) => updateBeneficiary(beneficiary.id, 'percentage', parseFloat(e.target.value) || 0)}
                              className={cn(
                                "pr-8",
                                isMobile && "text-base py-6"
                              )}
                            />
                            <span className={cn(
                              "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground",
                              isMobile && "text-base"
                            )}>
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Desktop: Grid layout
                    <div className="grid grid-cols-3 gap-3">
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
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {errors.beneficiaries && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.beneficiaries}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size={isMobile ? "default" : "sm"}
            onClick={addBeneficiary}
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Beneficiary
          </Button>
        </motion.div>

        {isMobile && (
          <motion.div 
            {...inputAnimation}
            className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800"
          >
            <div className="flex gap-2">
              <AlertCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
                  <li>Budget must equal your goal</li>
                  <li>Be specific about fund usage</li>
                  <li>Beneficiaries must total 100%</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
      
      {!isMobile && (
        <CardFooter className="flex justify-between bg-muted/50 p-6">
          <Button variant="outline" onClick={onBack} size="lg">
            Previous
          </Button>
          <Button onClick={handleNext} size="lg" className="min-w-[120px]">
            Next Step
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default BudgetBreakdownStepMobile;