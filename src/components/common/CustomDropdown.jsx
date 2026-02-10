import { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
  const panelRef = useRef(null);

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

  // Update dropdown position BEFORE browser paint using useLayoutEffect
  useLayoutEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const updatePosition = () => {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();

        // Use visualViewport for accurate mobile measurements, fallback to window
        const viewport = window.visualViewport || window;
        const viewportWidth = viewport.width || window.innerWidth;
        const viewportHeight = viewport.height || window.innerHeight;

        // Account for box-shadow visual overflow
        // shadow-2xl = 0 25px 50px -12px = 87px below, 62px horizontal
        const shadowVertical = 87;
        const shadowHorizontal = 62;

        // Measure actual dropdown height if panel exists, otherwise estimate
        const actualHeight = panelRef.current
          ? panelRef.current.offsetHeight
          : Math.min(320, options.length * 56); // 56px per option estimate

        const dropdownHeight = actualHeight + shadowVertical;
        const spacing = 8; // Space between button and dropdown
        const edgeMargin = 16; // Margin from viewport edges

        // Calculate initial position below button
        let top = rect.bottom + spacing;
        let left = rect.left;
        let positionAbove = false;

        // Check if dropdown would overflow bottom
        if (top + dropdownHeight > viewportHeight - edgeMargin) {
          // Try positioning above instead
          const topAbove = rect.top - dropdownHeight - spacing;
          if (topAbove >= edgeMargin) {
            top = topAbove;
            positionAbove = true;
          } else {
            // Neither above nor below fits perfectly - choose better option
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceAbove > spaceBelow) {
              // More space above - position at top edge with margin
              top = edgeMargin;
              positionAbove = true;
            } else {
              // More space below - keep below but adjust if needed
              top = Math.max(rect.bottom + spacing, edgeMargin);
            }
          }
        }

        // Adjust horizontal position accounting for shadow
        const dropdownWidth = rect.width + shadowHorizontal;

        if (left + dropdownWidth > viewportWidth - edgeMargin) {
          // Would overflow right edge - align to right with margin
          left = Math.max(edgeMargin, viewportWidth - dropdownWidth - edgeMargin);
        }

        // Ensure left doesn't go negative
        if (left < edgeMargin) {
          left = edgeMargin;
        }

        // Ensure top doesn't go off-screen
        if (top < edgeMargin) {
          top = edgeMargin;
        }

        // Constrain to viewport
        if (top + dropdownHeight > viewportHeight - edgeMargin) {
          top = Math.max(edgeMargin, viewportHeight - dropdownHeight - edgeMargin);
        }

        setDropdownPosition({
          top,
          left,
          width: rect.width,
          positionAbove
        });
      }
    };

    updatePosition();

    // Listen to visualViewport events for mobile keyboard/resize
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', updatePosition);
      visualViewport.addEventListener('scroll', updatePosition);
    }

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updatePosition);
        visualViewport.removeEventListener('scroll', updatePosition);
      }
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, options.length]);

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
            ref={panelRef}
            className="dropdown-panel fixed bg-white rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden border border-gray-200"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              opacity: dropdownPosition.top === 0 ? 0 : 1,
              transition: 'opacity 0.15s ease-in',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-y-auto max-h-80">
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
