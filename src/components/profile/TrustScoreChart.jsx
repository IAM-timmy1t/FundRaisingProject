import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';

const TrustScoreChart = ({ data, currentScore }) => {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload[0]) {
      const score = payload[0].value;
      const tier = getTierFromScore(score);
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-lg font-bold" style={{ color: payload[0].color }}>
            {score.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">{tier} Tier</p>
        </div>
      );
    }
    return null;
  };

  const getTierFromScore = (score) => {
    if (score >= 90) return 'STAR';
    if (score >= 75) return 'TRUSTED';
    if (score >= 50) return 'STEADY';
    if (score >= 25) return 'RISING';
    return 'NEW';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#F59E0B'; // Yellow for STAR
    if (score >= 75) return '#8B5CF6'; // Purple for TRUSTED
    if (score >= 50) return '#10B981'; // Green for STEADY
    if (score >= 25) return '#3B82F6'; // Blue for RISING
    return '#6B7280'; // Gray for NEW
  };

  // Add gradient definitions for the chart
  const gradientId = 'trustScoreGradient';

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getScoreColor(currentScore)} stopOpacity={0.8} />
              <stop offset="95%" stopColor={getScoreColor(currentScore)} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          
          <YAxis 
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Reference lines for tier boundaries */}
          <ReferenceLine 
            y={90} 
            stroke="#F59E0B" 
            strokeDasharray="3 3" 
            strokeOpacity={0.5}
            label={{ value: "STAR", position: "right", fontSize: 10 }}
          />
          <ReferenceLine 
            y={75} 
            stroke="#8B5CF6" 
            strokeDasharray="3 3" 
            strokeOpacity={0.5}
            label={{ value: "TRUSTED", position: "right", fontSize: 10 }}
          />
          <ReferenceLine 
            y={50} 
            stroke="#10B981" 
            strokeDasharray="3 3" 
            strokeOpacity={0.5}
            label={{ value: "STEADY", position: "right", fontSize: 10 }}
          />
          <ReferenceLine 
            y={25} 
            stroke="#3B82F6" 
            strokeDasharray="3 3" 
            strokeOpacity={0.5}
            label={{ value: "RISING", position: "right", fontSize: 10 }}
          />
          
          <Line
            type="monotone"
            dataKey="score"
            stroke={getScoreColor(currentScore)}
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            dot={{ fill: getScoreColor(currentScore), strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrustScoreChart;