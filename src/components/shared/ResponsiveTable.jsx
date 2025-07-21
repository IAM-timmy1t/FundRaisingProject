import React from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Responsive table component that transforms into cards on mobile
 * @param {Array} data - Array of data objects
 * @param {Array} columns - Column configuration
 * @param {string} title - Table title
 * @param {Function} onRowClick - Optional row click handler
 */
const ResponsiveTable = ({ 
  data = [], 
  columns = [], 
  title = '', 
  onRowClick = null,
  className = '',
  emptyMessage = 'No data available'
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile card view
    return (
      <div className={cn("space-y-4", className)}>
        {title && (
          <h3 className="text-lg font-semibold">{title}</h3>
        )}
        
        {data.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {emptyMessage}
            </CardContent>
          </Card>
        ) : (
          data.map((row, rowIndex) => (
            <Card 
              key={rowIndex}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                onRowClick && "hover:border-primary"
              )}
              onClick={() => onRowClick && onRowClick(row)}
            >
              <CardContent className="p-4 space-y-3">
                {columns.map((column, colIndex) => {
                  const value = column.accessor ? row[column.accessor] : '';
                  const formattedValue = column.formatter ? column.formatter(value, row) : value;
                  
                  // Skip rendering if column is marked as mobile hidden
                  if (column.mobileHidden) return null;
                  
                  return (
                    <div 
                      key={colIndex}
                      className={cn(
                        "flex items-start justify-between",
                        column.mobileClassName
                      )}
                    >
                      <span className="text-sm text-muted-foreground">
                        {column.header}
                      </span>
                      <span className={cn(
                        "text-sm font-medium text-right",
                        column.valueClassName
                      )}>
                        {formattedValue}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index}
                  className={cn(
                    column.className,
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center'
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="text-center py-8 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow 
                  key={rowIndex}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((column, colIndex) => {
                    const value = column.accessor ? row[column.accessor] : '';
                    const formattedValue = column.formatter ? column.formatter(value, row) : value;
                    
                    return (
                      <TableCell 
                        key={colIndex}
                        className={cn(
                          column.className,
                          column.align === 'right' && 'text-right',
                          column.align === 'center' && 'text-center'
                        )}
                      >
                        {formattedValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ResponsiveTable;