import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  itemLabel = 'records',
  onPageChange,
}) => {
  if (totalItems === 0 || totalPages <= 1) return null;

  const getPageNumbers = (): Array<number | 'ellipsis'> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: Array<number | 'ellipsis'> = [1];
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);

    if (left > 2) pages.push('ellipsis');
    for (let p = left; p <= right; p++) {
      pages.push(p);
    }
    if (right < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  return (
    <nav className="ae-pagination" aria-label="Pagination Navigation">
      <div className="ae-pagination-info">
        Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of{' '}
        <strong>{totalItems}</strong> {itemLabel}
      </div>
      <div className="ae-pagination-controls">
        <button
          type="button"
          className="ae-page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <i className="fa-solid fa-chevron-left ae-icon-polished mr-1" />
          Prev
        </button>

        {getPageNumbers().map((entry, idx) =>
          entry === 'ellipsis' ? (
            <span key={`e-${idx}`} className="ae-page-ellipsis" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={`ae-page-btn ${entry === currentPage ? 'is-active' : ''}`}
              onClick={() => onPageChange(entry)}
              aria-current={entry === currentPage ? 'page' : undefined}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          className="ae-page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          Next
          <i className="fa-solid fa-chevron-right ae-icon-polished ml-1" />
        </button>
      </div>
    </nav>
  );
};
