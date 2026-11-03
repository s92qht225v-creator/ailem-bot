/**
 * Category helpers shared by AdminContext, the admin Categories section and
 * customer navigation.
 */

// Display order: explicit sort_order (shared, from DB) first, then creation
// time, then name. Rows without sort_order (DB not yet migrated, or created by
// an older client) go last in creation order.
export const sortCategories = (categories) =>
  [...(categories || [])].sort((a, b) => {
    const ao = Number.isFinite(a?.sort_order) ? a.sort_order : Infinity;
    const bo = Number.isFinite(b?.sort_order) ? b.sort_order : Infinity;
    if (ao !== bo) return ao < bo ? -1 : 1;
    const at = a?.created_at || '';
    const bt = b?.created_at || '';
    if (at !== bt) return at < bt ? -1 : 1;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });

// Number of products assigned to a category in already-loaded client state
export const countProductsInCategory = (products, categoryName) =>
  (products || []).filter(p => p.category === categoryName).length;
