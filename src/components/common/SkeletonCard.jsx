const SkeletonCard = () => (
  <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
    <div className="w-full aspect-[4/5] bg-gray-200" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-6 bg-gray-200 rounded w-2/3 mt-2" />
    </div>
  </div>
);

export default SkeletonCard;
