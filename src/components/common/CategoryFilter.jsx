const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }) => {
  // Handle both old format (strings) and new format (objects with displayName/filterName)
  const allCategories = [
    { displayName: 'All', filterName: 'All' },
    ...(categories.map(cat => 
      typeof cat === 'string' ? { displayName: cat, filterName: cat } : cat
    ))
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {allCategories.map((category) => (
        <button
          key={category.filterName}
          onClick={() => onCategoryChange(category.filterName)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            selectedCategory === category.filterName
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {category.displayName}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
