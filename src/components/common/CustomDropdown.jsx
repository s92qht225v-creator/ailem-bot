import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from "../../utils/translation-fallback";
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
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      // Check if click is on the dropdown button or inside the dropdown panel
      const isDropdownButton = dropdownRef.current && dropdownRef.current.contains(event.target);
      const isDropdownPanel = event.target.closest('.dropdown-panel');

      if (!isDropdownButton && !isDropdownPanel) {
        setIsOpen(false);
      }
    };

    // Use timeout to avoid immediate closing when opening
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt === value);
  const displayValue = (value === t('shop.all') || !value) ? placeholder : selectedOption;
  const isPlaceholder = (value === t('shop.all') || !value);

  // Get button position for fixed positioning of dropdown
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Update dropdown position when it opens or window scrolls/resizes
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const updatePosition = () => {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 320; // max-h-80 = 320px
        const spacing = 4;

        // Calculate initial position
        let top = rect.bottom + spacing;
        let left = rect.left;

        // Adjust if dropdown would go off the right edge
        if (left + rect.width > viewportWidth) {
          left = viewportWidth - rect.width - 8; // 8px padding from edge
        }

        // Adjust if dropdown would go off the bottom edge
        if (top + dropdownHeight > viewportHeight) {
          // Position above the button instead
          top = rect.top - dropdownHeight - spacing;
        }

        // Ensure left doesn't go negative
        if (left < 8) {
          left = 8;
        }

        // Ensure top doesn't go negative
        if (top < 8) {
          top = 8;
        }

        setDropdownPosition({
          top,
          left,
          width: rect.width
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

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

      {/* Dropdown Panel - Render via Portal to escape overflow container */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Options Panel - Fixed positioning via Portal */}
          <div
            className="dropdown-panel fixed bg-white rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto border border-gray-200 animate-fade-in"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option);
                }}
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
        </>,
        document.body
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
