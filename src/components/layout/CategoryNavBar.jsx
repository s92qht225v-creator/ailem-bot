import { useContext, useMemo } from 'react';
import { AdminContext } from '../../context/AdminContext';

const CategoryNavBar = ({ onNavigate, currentCategory }) => {
  const { categories } = useContext(AdminContext);

  const visibleCategories = useMemo(() =>
    categories?.filter(c => c.visible !== false) || [],
    [categories]
  );

  if (visibleCategories.length === 0) return null;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-14 z-30">
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {visibleCategories.map((category) => {
            const isActive = currentCategory === category.name;
            return (
              <button
                key={category.id}
                onClick={() => onNavigate('shop', { category: category.name })}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default CategoryNavBar;
