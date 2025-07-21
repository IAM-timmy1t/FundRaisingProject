import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CampaignMetricsChart = ({ campaigns }) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('30days');
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    generateChartData();
  }, [campaigns, timeRange]);

  const generateChartData = () => {
    // Calculate the date range
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
    const data = [];
    const today = new Date();

    // Initialize data points
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date,
        amount: 0,
        donors: 0,
        donations: 0
      });
    }

    // Aggregate donation data from campaigns
    campaigns.forEach(campaign => {
      if (campaign.donations) {
        campaign.donations.forEach(donation => {
          const donationDate = new Date(donation.created_at);
          const dayIndex = data.findIndex(d => {
            const dataDate = new Date(d.fullDate);
            return dataDate.toDateString() === donationDate.toDateString();
          });

          if (dayIndex !== -1) {
            data[dayIndex].amount += donation.amount;
            data[dayIndex].donations += 1;
            // Count unique donors (simplified - in real app, track unique donor IDs)
            data[dayIndex].donors += 1;
          }
        });
      }
    });

    // Calculate cumulative totals
    let cumulativeAmount = 0;
    data.forEach(day => {
      cumulativeAmount += day.amount;
      day.cumulativeAmount = cumulativeAmount;
    });

    setChartData(data);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border">
          <p className="font-semibold text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Amount') 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasData = chartData.some(d => d.amount > 0);

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>{t('recipient.noDataToDisplay', 'No donation data to display yet')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorDonors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fill: '#6b7280' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />
          <Area 
            type="monotone" 
            dataKey="amount" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorAmount)"
            name="Daily Amount"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="cumulativeAmount" 
            stroke="#f59e0b" 
            name="Cumulative Total"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(chartData.reduce((sum, d) => sum + d.amount, 0))}
          </p>
          <p className="text-sm text-gray-600">Total Raised</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {chartData.reduce((sum, d) => sum + d.donations, 0)}
          </p>
          <p className="text-sm text-gray-600">Total Donations</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {chartData.filter(d => d.amount > 0).length}
          </p>
          <p className="text-sm text-gray-600">Active Days</p>
        </div>
      </div>
    </div>
  );
};

export default CampaignMetricsChart;