'use client';

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-yt-white mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-yt-dark border rounded px-4 py-2 text-white 
            placeholder-yt-text focus:outline-none focus:ring-2 
            transition-colors
            ${error 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-yt-light-gray focus:ring-blue-500 focus:border-blue-500'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-yt-text">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
