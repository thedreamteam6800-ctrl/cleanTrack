'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalItems: number;
  perPage: number;
}

interface UsePaginationOptions {
  defaultPage?: number;
  perPage?: number;
  pageParam?: string;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    defaultPage = 1,
    perPage = 20,
    pageParam = 'page'
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: defaultPage,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    totalItems: 0,
    perPage
  });

  // Initialize pagination from URL params
  useEffect(() => {
    const page = parseInt(searchParams.get(pageParam) || '1', 10);
    if (page > 0) {
      setPagination(prev => ({
        ...prev,
        currentPage: page
      }));
    }
  }, [searchParams, pageParam]);

  // Update pagination state when data changes
  const updatePagination = useCallback((data: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  }) => {
    setPagination({
      currentPage: data.current_page,
      totalPages: data.last_page,
      hasNextPage: data.current_page < data.last_page,
      hasPrevPage: data.current_page > 1,
      totalItems: data.total,
      perPage: data.per_page
    });
  }, []);

  // Change page and update URL
  const changePage = useCallback((page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));

    // Update URL without causing a full page reload
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      newSearchParams.delete(pageParam);
    } else {
      newSearchParams.set(pageParam, page.toString());
    }
    
    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [pagination.totalPages, searchParams, pageParam, router]);

  // Reset pagination to page 1
  const resetPagination = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
    
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete(pageParam);
    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pageParam, router]);

  return {
    pagination,
    updatePagination,
    changePage,
    resetPagination,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage,
    totalItems: pagination.totalItems,
    perPage: pagination.perPage
  };
}