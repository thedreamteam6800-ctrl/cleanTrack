'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPrevPage,
  isLoading = false,
  className
}: PaginationProps) {
  const handlePrevious = () => {
    if (hasPrevPage && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (hasNextPage && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center space-x-4", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={!hasPrevPage || isLoading}
        className="flex items-center space-x-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </Button>
      
      <div className="flex items-center space-x-1 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
        <FileText className="h-4 w-4" />
        <span>Page {currentPage} of {totalPages}</span>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={!hasNextPage || isLoading}
        className="flex items-center space-x-1"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
