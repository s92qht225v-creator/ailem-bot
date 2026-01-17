/**
 * Check if the app is running in admin mode.
 * Admin mode is determined by ?admin=true in the URL.
 */
export const isAdminMode = () => {
  return window.location.search.includes('admin=true');
};

/**
 * Hook to get admin mode status (can be extended to use React state if needed)
 */
export const useAdminMode = () => {
  return isAdminMode();
};

export default useAdminMode;
