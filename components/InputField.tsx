
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface InputFieldProps {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (key: string, val: string) => void;
  onBlur?: (key: string) => void;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'number' | 'select' | 'radio' | 'date' | 'textarea';
  options?: { label: string; value: string }[];
  error?: string;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  fieldKey, 
  value, 
  onChange, 
  placeholder, 
  className,
  type = 'text',
  options,
  error,
  onBlur,
  required
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync query with value for Select inputs
  useEffect(() => {
    if (type === 'select') {
        const selectedOption = options?.find(opt => opt.value === value);
        if (selectedOption) {
            setQuery(selectedOption.label);
        } else {
            setQuery(value);
        }
    }
  }, [value, type, options]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Date Conversion: DD/MM/YYYY (stored) <-> YYYY-MM-DD (input)
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value; // YYYY-MM-DD
    if (!rawValue) {
      onChange(fieldKey, '');
      return;
    }
    const [year, month, day] = rawValue.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    onChange(fieldKey, formattedDate);
  };

  const getDateValue = () => {
    if (!value || !value.includes('/')) return '';
    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}`;
  };

  const inputClass = `w-full border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'} bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 outline-none transition-all shadow-sm`;

  // Filter options based on query
  const filteredOptions = type === 'select' && options 
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(query.toLowerCase()) || 
        opt.value.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const renderInput = () => {
    if (type === 'select' && options) {
        return (
            <div className="relative" ref={wrapperRef}>
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                            onChange(fieldKey, e.target.value);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() => onBlur?.(fieldKey)}
                        placeholder={placeholder || 'Chọn hoặc tìm kiếm...'}
                        className={`${inputClass} pr-8`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fadeIn">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 text-slate-700 ${value === opt.value ? 'bg-blue-50 font-medium text-blue-700' : ''}`}
                                    onClick={() => {
                                        onChange(fieldKey, opt.value);
                                        setQuery(opt.label);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-slate-400">Không tìm thấy kết quả</div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (type === 'date') {
        return (
            <input
                id={fieldKey}
                type="date"
                value={getDateValue()}
                onChange={handleDateChange}
                onBlur={() => onBlur?.(fieldKey)}
                className={inputClass}
            />
        );
    }

    if (type === 'radio') {
        const opts = options || [];
        return (
            <div className="flex flex-row items-center gap-6 mt-1">
                {opts.map(o => (
                    <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={fieldKey}
                            value={o.value}
                            checked={value === o.value}
                            onChange={(e) => onChange(fieldKey, e.target.value)}
                            className="w-4 h-4 text-blue-600 bg-white border-slate-300 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-slate-700">{o.label}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (type === 'textarea') {
        return (
            <textarea
                id={fieldKey}
                value={value}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                onBlur={() => onBlur?.(fieldKey)}
                placeholder={placeholder}
                rows={4}
                className={`${inputClass} resize-y min-h-[100px]`}
            />
        );
    }

    return (
        <input
            id={fieldKey}
            type={type === 'number' ? 'text' : type}
            inputMode={type === 'number' ? 'numeric' : 'text'}
            value={value}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            onBlur={() => onBlur?.(fieldKey)}
            placeholder={placeholder}
            className={inputClass}
        />
    );
  };

  return (
    <div className={`flex flex-col gap-1.5 ${type === 'textarea' ? 'md:col-span-2' : ''} ${className || ''}`}>
      <label htmlFor={fieldKey} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label} {required && <span className="text-red-400">*</span>} <span className="text-slate-400 font-normal normal-case opacity-70">{"{"}{fieldKey}{"}"}</span>
      </label>
      
      {renderInput()}
      
      {error && <span className="text-xs text-red-500 mt-0.5 italic animate-fadeIn">{error}</span>}
    </div>
  );
};

export default InputField;
