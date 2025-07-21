import React from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * ResponsiveTable Component
 * Automatically converts table layout to cards on mobile devices
 * 
 * @param {Array} columns - Column configuration
 * @param {Array} data - Table data
 * @param {Function} onRowClick - Optional row click handler
 * @param {String} className - Additional classes
 * @param {Boolean} loading - Loading state
 * @param {String} emptyMessage - Message when no data
 */
const ResponsiveTable = ({
  columns,
  data,
  onRowClick,
  className,
  loading = false,
  emptyMessage = "No data available",
  cardClassName = "",
  enableSelection = false,
  selectedRows = [],
  onSelectionChange
}) => {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)}>
        {data.map((row, rowIndex) => (
          <Card
            key={row.id || rowIndex}
            className={cn(
              "overflow-hidden transition-all",
              onRowClick && "cursor-pointer hover:shadow-lg",
              selectedRows.includes(row.id) && "ring-2 ring-primary",
              cardClassName
            )}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-4 space-y-3">
              {/* Selection checkbox for mobile */}
              {enableSelection && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={selectedRows.includes(row.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        onSelectionChange?.([...selectedRows, row.id]);
                      } else {
                        onSelectionChange?.(selectedRows.filter(id => id !== row.id));
                      }
                    }}
                  />
                  <span className="text-sm text-muted-foreground">Select</span>
                </div>
              )}

              {columns.map((column) => {
                const value = row[column.accessor];
                const formattedValue = column.cell ? column.cell(row) : value;

                // Skip hidden columns on mobile
                if (column.hideOnMobile) return null;

                return (
                  <div key={column.accessor} className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      {column.header}
                    </span>
                    <div className="text-sm">
                      {column.mobileRender ? column.mobileRender(row) : formattedValue}
                    </div>
                  </div>
                );
              })}

              {/* Mobile actions */}
              {columns.find(col => col.accessor === 'actions') && (
                <div className="pt-2 border-t">
                  {columns.find(col => col.accessor === 'actions').cell(row)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {enableSelection && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={selectedRows.length === data.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange?.(data.map(row => row.id));
                    } else {
                      onSelectionChange?.([]);
                    }
                  }}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.accessor}
                className={cn(
                  column.className,
                  column.sortable && "cursor-pointer hover:bg-muted/50"
                )}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  {column.sortable && (
                    <span className="text-xs">↕</span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow
              key={row.id || rowIndex}
              className={cn(
                onRowClick && "cursor-pointer",
                selectedRows.includes(row.id) && "bg-muted/50"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {enableSelection && (
                <TableCell>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={selectedRows.includes(row.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        onSelectionChange?.([...selectedRows, row.id]);
                      } else {
                        onSelectionChange?.(selectedRows.filter(id => id !== row.id));
                      }
                    }}
                  />
                </TableCell>
              )}
              {columns.map((column) => {
                const value = row[column.accessor];
                const formattedValue = column.cell ? column.cell(row) : value;

                return (
                  <TableCell key={column.accessor} className={column.className}>
                    {formattedValue}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * Example usage:
 * 
 * const columns = [
 *   {
 *     header: 'Name',
 *     accessor: 'name',
 *     cell: (row) => <span className="font-medium">{row.name}</span>,
 *     mobileRender: (row) => <span className="font-bold">{row.name}</span>
 *   },
 *   {
 *     header: 'Status',
 *     accessor: 'status',
 *     cell: (row) => <Badge>{row.status}</Badge>,
 *     hideOnMobile: false
 *   },
 *   {
 *     header: 'Date',
 *     accessor: 'date',
 *     cell: (row) => formatDate(row.date),
 *     className: 'text-right'
 *   },
 *   {
 *     header: 'Actions',
 *     accessor: 'actions',
 *     cell: (row) => <Button size="sm">View</Button>
 *   }
 * ];
 */

export default ResponsiveTable;
