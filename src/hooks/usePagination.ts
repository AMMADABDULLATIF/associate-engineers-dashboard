import { useEffect, useMemo, useState } from 'react';

export interface PaginationResult<T> {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  paginatedItems: T[];
  resetPage: () => void;
}

export function usePagination<T>(
  items: T[],
  pageSize: number,
  resetDeps: readonly unknown[] = []
): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const resetKey = JSON.stringify(resetDeps);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  return {
    currentPage: safePage,
    setCurrentPage: (page: number) => {
      const clamped = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(clamped);
    },
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    pageSize,
    paginatedItems,
    resetPage: () => setCurrentPage(1),
  };
}
