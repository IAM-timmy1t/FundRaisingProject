import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, Package } from 'lucide-react';

const CampaignBudgetBreakdown = ({ campaign }) => {
  const { budget_breakdown, beneficiaries, goal_amount, raised_amount, currency } = campaign;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Parse budget breakdown if it's a string
  const budgetItems = typeof budget_breakdown === 'string' 
    ? JSON.parse(budget_breakdown || '[]') 
    : budget_breakdown || [];

  const totalBudget = budgetItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const fundingProgress = goal_amount > 0 ? (raised_amount / goal_amount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Budget Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Items */}
        {budgetItems.length > 0 ? (
          <div className="space-y-4">
            {budgetItems.map((item, index) => {
              const itemProgress = raised_amount > 0 
                ? Math.min(100, (raised_amount / goal_amount) * 100)
                : 0;
              const itemFunded = (parseFloat(item.amount) * itemProgress) / 100;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.item}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(itemFunded)} funded
                      </p>
                    </div>
                  </div>
                  <Progress value={itemProgress} className="h-2" />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No budget breakdown provided
          </p>
        )}

        {/* Total Summary */}
        {budgetItems.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Budget</span>
              <span className="font-bold text-lg">{formatCurrency(totalBudget)}</span>
            </div>
            {Math.abs(totalBudget - goal_amount) > 1 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Campaign Goal</span>
                <span className="text-muted-foreground">{formatCurrency(goal_amount)}</span>
              </div>
            )}
          </div>
        )}

        {/* Beneficiaries */}
        {beneficiaries && beneficiaries.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Beneficiaries
            </h4>
            <div className="space-y-2">
              {beneficiaries.map((beneficiary, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{beneficiary.name}</p>
                    {beneficiary.relationship && (
                      <p className="text-sm text-muted-foreground">{beneficiary.relationship}</p>
                    )}
                  </div>
                  {beneficiary.needs && (
                    <Badge variant="outline" className="text-xs">
                      {beneficiary.needs}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignBudgetBreakdown;