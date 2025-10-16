import { Search } from 'lucide-react';

const Header = ({ onSearch, searchQuery, showSearch = true, title = 'Ailem' }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-mobile mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-primary">{title}</h1>
        </div>

        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
