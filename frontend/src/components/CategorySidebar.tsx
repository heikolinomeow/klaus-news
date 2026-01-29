import React from 'react';

interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (name: string | null) => void;
  groupCounts?: Record<string, number>;
  totalCount?: number;
  worthinessThreshold?: number;
  minSourcesThreshold?: number;
  onWorthinessChange?: (value: number) => void;
  onMinSourcesChange?: (value: number) => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  groupCounts = {},
  totalCount = 0,
  worthinessThreshold,
  minSourcesThreshold,
  onWorthinessChange,
  onMinSourcesChange,
}) => {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <aside className="category-sidebar">
      <div className="sidebar-title">Categories</div>

      {worthinessThreshold !== undefined && onWorthinessChange && onMinSourcesChange && (
        <>
          <div className="sidebar-filters">
            <div className="sidebar-filter-title">Filters</div>
            <div className="sidebar-filter-item">
              <label>Worthiness</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={worthinessThreshold}
                onChange={(e) => onWorthinessChange(parseFloat(e.target.value))}
                className="filter-slider"
              />
              <span className="filter-value">{worthinessThreshold.toFixed(2)}</span>
            </div>
            <div className="sidebar-filter-item">
              <label>Min Sources</label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={minSourcesThreshold ?? 1}
                onChange={(e) => onMinSourcesChange(parseInt(e.target.value))}
                className="filter-slider"
              />
              <span className="filter-value">{minSourcesThreshold}</span>
            </div>
          </div>

          <div className="sidebar-divider" />
        </>
      )}

      <div
        className={`sidebar-item ${selectedCategory === null ? 'active' : ''}`}
        onClick={() => onSelectCategory(null)}
      >
        <span>All</span>
        {totalCount > 0 && <span className="sidebar-count">{totalCount}</span>}
      </div>

      <div className="sidebar-divider" />

      {sortedCategories.map((category) => (
        <div key={category.id} className="sidebar-category-block">
          <div
            className={`sidebar-item ${selectedCategory === category.name ? 'active' : ''}`}
            onClick={() => onSelectCategory(category.name)}
            title={category.description}
          >
            <span>{category.name}</span>
            {groupCounts[category.name] !== undefined && groupCounts[category.name] > 0 && (
              <span className="sidebar-count">{groupCounts[category.name]}</span>
            )}
          </div>
                  </div>
      ))}
    </aside>
  );
};

export default CategorySidebar;
