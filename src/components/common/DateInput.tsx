import React from 'react';

interface DateInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  required?: boolean;
  className?: string;
  wrapClassName?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  id,
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  title,
  required,
  className,
  wrapClassName = '',
}) => {
  const isEmpty = !value;

  return (
    <div
      className={`ae-date-wrap ${isEmpty ? 'is-empty' : ''} ${wrapClassName}`.trim()}
    >
      <input
        type="date"
        id={id}
        value={value}
        required={required}
        title={title}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
      <span className="ae-date-placeholder" aria-hidden="true">
        {placeholder}
      </span>
      <i
        className="fa-regular fa-calendar ae-date-icon"
        aria-hidden="true"
      />
    </div>
  );
};
