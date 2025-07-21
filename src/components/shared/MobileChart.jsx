import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  AreaChart, 
  BarChart, 
  PieChart,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Mobile-optimized chart wrapper
 * Automatically adjusts chart dimensions and features based on screen size
 */
const MobileChart = ({ 
  type = 'line',
  data = [],
  title,
  description,
  height = 300,
  className,
  children,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  customTooltip,
  aspectRatio,
  ...chartProps
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Adjust dimensions based on device
  const getChartDimensions = () => {
    if (isMobile) {
      return {
        height: aspectRatio ? undefined : 250,
        margin: { top: 5, right: 5, left: 5, bottom: 5 },
        fontSize: 10,
        strokeWidth: 2
      };
    } else if (isTablet) {
      return {
        height: aspectRatio ? undefined : 280,
        margin: { top: 10, right: 10, left: 10, bottom: 10 },
        fontSize: 11,
        strokeWidth: 2
      };
    }
    return {
      height: aspectRatio ? undefined : height,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
      fontSize: 12,
      strokeWidth: 3
    };
  };

  const dimensions = getChartDimensions();

  // Custom mobile tooltip
  const MobileTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-2 shadow-lg">
          <p className="text-xs font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: dimensions.margin,
      ...chartProps
    };

    const axisProps = {
      tick: { fontSize: dimensions.fontSize },
      tickLine: false,
      axisLine: false
    };

    const tooltipContent = customTooltip || (isMobile ? <MobileTooltip /> : undefined);

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis {...axisProps} />
            <YAxis {...axisProps} />
            {showTooltip && <Tooltip content={tooltipContent} />}
            {showLegend && !isMobile && <Legend />}
            {children}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis {...axisProps} />
            <YAxis {...axisProps} />
            {showTooltip && <Tooltip content={tooltipContent} />}
            {showLegend && !isMobile && <Legend />}
            {children}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis {...axisProps} />
            <YAxis {...axisProps} />
            {showTooltip && <Tooltip content={tooltipContent} />}
            {showLegend && !isMobile && <Legend />}
            {children}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            {showTooltip && <Tooltip content={tooltipContent} />}
            {showLegend && <Legend />}
            {children}
          </PieChart>
        );

      default:
        return null;
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className={cn(
          isMobile && "pb-2"
        )}>
          {title && <CardTitle className={cn(
            isMobile && "text-base"
          )}>{title}</CardTitle>}
          {description && <CardDescription className={cn(
            isMobile && "text-xs"
          )}>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn(
        isMobile && "p-2"
      )}>
        <ResponsiveContainer 
          width="100%" 
          height={dimensions.height}
          aspect={aspectRatio}
        >
          {renderChart()}
        </ResponsiveContainer>
        
        {/* Mobile legend if needed */}
        {showLegend && isMobile && (
          <div className="mt-2 flex flex-wrap gap-2 justify-center">
            {/* Legend items would be rendered here based on chart data */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileChart;