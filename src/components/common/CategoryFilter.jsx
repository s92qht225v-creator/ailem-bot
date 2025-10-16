const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }) => {
  const allCategories = ['All', ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {allCategories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            selectedCategory === category
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
