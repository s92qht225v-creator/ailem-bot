import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomDropdown = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt === value);
  const displayValue = (value === 'All' || !value) ? placeholder : selectedOption;
  const isPlaceholder = (value === 'All' || !value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-sm text-left border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-between"
      >
        <span className={isPlaceholder ? 'text-gray-400' : 'text-gray-900'}>
          {displayValue}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Options Panel */}
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto border border-gray-200 animate-fade-in">
            {options.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full px-4 py-4 text-left text-base transition-colors flex items-center justify-between ${
                  value === option
                    ? 'bg-accent text-white font-semibold'
                    : 'text-gray-900 hover:bg-gray-50'
                } ${
                  index === 0 ? 'rounded-t-xl' : ''
                } ${
                  index === options.length - 1 ? 'rounded-b-xl' : 'border-b border-gray-100'
                }`}
              >
                <span>{option}</span>
                {value === option && (
                  <Check className="w-5 h-5" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required
          className="absolute opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      )}
    </div>
  );
};

export default CustomDropdown;
