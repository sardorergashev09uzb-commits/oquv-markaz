'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  emptyText?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Tanlang...',
  className,
  buttonClassName,
  disabled = false,
  searchable = false,
  emptyText = 'Hech narsa topilmadi',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  // Selected item label
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Filtered options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const handleSelect = (optValue: string | number) => {
    onChange(String(optValue));
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full text-left', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border select-none cursor-pointer',
          'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 shadow-xs hover:border-gray-300 dark:hover:border-gray-600',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
          isOpen && 'ring-2 ring-blue-500/20 border-blue-500 dark:border-blue-400',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800',
          buttonClassName
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-gray-400 font-normal">{placeholder}</span>}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180 text-blue-600 dark:text-blue-400'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 min-w-[200px] w-full rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search box if enabled or if many options */}
          {(searchable || options.length > 7) && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-center text-gray-400 dark:text-gray-500">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs sm:text-sm transition cursor-pointer',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 font-medium'
                    )}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
