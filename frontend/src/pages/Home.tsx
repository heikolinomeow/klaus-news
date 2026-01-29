/**
 * Home page - displays groups as tiles (V-5 group-centric view)
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group } from '../types';
import { groupsApi, settingsApi } from '../services/api';
import PostList from '../components/PostList';
import CategorySidebar from '../components/CategorySidebar';

interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [worthinessThreshold, setWorthinessThreshold] = useState(0.6);
  const [minSourcesThreshold, setMinSourcesThreshold] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsResponse, categoriesResponse] = await Promise.all([
        groupsApi.getAll(),
        settingsApi.getByKey('categories')
      ]);
      setGroups(groupsResponse.data.groups || []);
      const cats = categoriesResponse.data.value
        ? JSON.parse(categoriesResponse.data.value)
        : [];
      setCategories(cats);
            setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = async (groupId: number) => {
    try {
      setIsSelecting(true);
      await groupsApi.select(groupId);
      await groupsApi.transition(groupId, 'COOKING');
      navigate('/cooking');
    } catch (err) {
      setError('Failed to select group. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleArchiveGroup = async (groupId: number) => {
    try {
      await groupsApi.archive(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (err) {
      console.error('Failed to archive group:', err);
    }
  };

  
  const filteredGroups = useMemo(() => {
    return groups.filter((g: Group) => {
      // Filter by selected category if any
      if (selectedCategory && g.category !== selectedCategory) {
        return false;
      }
      // Filter by worthiness threshold (treat null as 0)
      if ((g.max_worthiness ?? 0) < worthinessThreshold) {
        return false;
      }
      // Filter by min sources threshold
      return g.post_count >= minSourcesThreshold;
    });
  }, [groups, selectedCategory, worthinessThreshold, minSourcesThreshold]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Count groups that meet both filter criteria
    groups.forEach((g: Group) => {
      if (g.category) {
        const meetsWorthiness = (g.max_worthiness ?? 0) >= worthinessThreshold;
        const meetsSources = g.post_count >= minSourcesThreshold;
        if (meetsWorthiness && meetsSources) {
          counts[g.category] = (counts[g.category] || 0) + 1;
        }
      }
    });
    return counts;
  }, [groups, worthinessThreshold, minSourcesThreshold]);

  const totalVisibleCount = useMemo(() => {
    return groups.filter((g: Group) => {
      const meetsWorthiness = (g.max_worthiness ?? 0) >= worthinessThreshold;
      const meetsSources = g.post_count >= minSourcesThreshold;
      return meetsWorthiness && meetsSources;
    }).length;
  }, [groups, worthinessThreshold, minSourcesThreshold]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-with-sidebar">
      <CategorySidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        groupCounts={groupCounts}
        totalCount={totalVisibleCount}
        worthinessThreshold={worthinessThreshold}
        minSourcesThreshold={minSourcesThreshold}
        onWorthinessChange={setWorthinessThreshold}
        onMinSourcesChange={setMinSourcesThreshold}
      />
      <div className="sidebar-main-content">
        <div className="home-page">
          <h2>News Stories</h2>
          <PostList
            groups={filteredGroups}
            onSelectGroup={handleSelectGroup}
            onArchiveGroup={handleArchiveGroup}
            isSelecting={isSelecting}
          />
        </div>
      </div>
    </div>
  );
}

export default Home;
