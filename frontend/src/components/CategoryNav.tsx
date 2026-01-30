import React from 'react';

interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (name: string | null) => void;
  groupCounts?: Record<string, number>;
  totalCount?: number;
}

const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  groupCounts = {},
}) => {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <nav className="category-nav">
      {sortedCategories.map((category) => (
        <div
          key={category.id}
          className={`category-nav-item ${selectedCategory === category.name ? 'active' : ''}`}
          onClick={() => onSelectCategory(category.name)}
          title={category.description}
        >
          <span>{category.name}</span>
          {groupCounts[category.name] !== undefined && groupCounts[category.name] > 0 && (
            <span className="category-nav-count">{groupCounts[category.name]}</span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default CategoryNav;
