/**
 * Shared, client-safe helpers for the real heritage catalogue stored in the
 * database. Category names are stored as "English|தமிழ்" so both scripts stay
 * in one row without a schema change.
 */

export interface HeritageCategoryView {
  id: string;
  slug: string;
  title: string;
  titleTamil: string;
  description: string;
  topics: { id: string; title: string; description: string; query: string }[];
}

export function splitCategoryName(name: string): { title: string; titleTamil: string } {
  const [title, titleTamil] = name.split("|");
  return { title: (title ?? name).trim(), titleTamil: (titleTamil ?? "").trim() };
}
