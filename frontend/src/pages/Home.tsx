/**
 * Home page - displays groups as tiles (V-5 group-centric view)
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group } from '../types';
import { groupsApi, settingsApi, adminApi, listsApi } from '../services/api';
import PostList from '../components/PostList';
import CategoryNav from '../components/CategoryNav';
import FilterSidebar, { SortOption } from '../components/FilterSidebar';
import IngestionProgress from '../components/IngestionProgress';

interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('News');
  const [worthinessThreshold, setWorthinessThreshold] = useState(0.3);
  const [minSourcesThreshold, setMinSourcesThreshold] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('worthiness');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const navigate = useNavigate();

  // Ingestion controls state
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(false);
  const [nextRunTime, setNextRunTime] = useState<string | null>(null);
  const [ingestInterval, setIngestInterval] = useState(30);
  const [postsPerFetch, setPostsPerFetch] = useState(5);
  const [estimatedApiCalls, setEstimatedApiCalls] = useState(0);
  const [enabledListsCount, setEnabledListsCount] = useState(0);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    loadIngestionSettings();
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

  const loadIngestionSettings = async () => {
    try {
      const [
        autoFetchRes,
        postsPerFetchRes,
        ingestIntervalRes,
        listsRes,
        schedulerRes
      ] = await Promise.all([
        settingsApi.getByKey('auto_fetch_enabled'),
        settingsApi.getByKey('posts_per_fetch'),
        settingsApi.getByKey('ingest_interval_minutes'),
        listsApi.getAll(),
        adminApi.getSchedulerStatus()
      ]);

      if (autoFetchRes.data?.value !== undefined) {
        setAutoFetchEnabled(autoFetchRes.data.value === 'true' || autoFetchRes.data.value === true);
      }
      if (postsPerFetchRes.data?.value) {
        setPostsPerFetch(parseInt(postsPerFetchRes.data.value));
      }
      if (ingestIntervalRes.data?.value) {
        setIngestInterval(parseInt(ingestIntervalRes.data.value));
      }

      const listsCount = listsRes.data.lists.filter((l: any) => l.enabled).length;
      setEnabledListsCount(listsCount);

      // Calculate API rate
      const posts = postsPerFetchRes.data?.value ? parseInt(postsPerFetchRes.data.value) : 5;
      const interval = ingestIntervalRes.data?.value ? parseInt(ingestIntervalRes.data.value) : 30;
      const cyclesPerHour = 60 / interval;
      setEstimatedApiCalls(Math.round(posts * listsCount * cyclesPerHour));

      // Get next run time
      const ingestJob = schedulerRes.data.jobs.find((j: any) => j.id === 'ingest_posts');
      if (ingestJob?.next_run_time) {
        const nextRun = new Date(ingestJob.next_run_time);
        const now = new Date();
        const diffMinutes = Math.floor((nextRun.getTime() - now.getTime()) / 60000);
        setNextRunTime(`${diffMinutes} min`);
      }
    } catch (err) {
      console.error('Failed to load ingestion settings:', err);
    }
  };

  const handleToggleAutoFetch = async () => {
    const newValue = !autoFetchEnabled;
    setAutoFetchEnabled(newValue);
    await settingsApi.update('auto_fetch_enabled', newValue.toString());
  };

  const handleTriggerIngestion = async () => {
    try {
      setOperationFeedback('⏳ Fetching...');
      const response = await adminApi.triggerIngestion();
      const stats = response.data.stats;
      const feedback = stats.new_posts_added === 0
        ? `ℹ️ ${response.data.message}`
        : `✓ ${response.data.message}`;
      setOperationFeedback(feedback);
      setTimeout(() => setOperationFeedback(null), 5000);
      loadIngestionSettings();
      fetchData();
    } catch (err) {
      setOperationFeedback('✗ Ingestion failed');
      setTimeout(() => setOperationFeedback(null), 5000);
      console.error('Failed to trigger ingestion:', err);
    }
  };

  const handleIngestIntervalChange = async (value: number) => {
    setIngestInterval(value);
    await settingsApi.update('ingest_interval_minutes', value.toString());
    // Recalculate API rate
    const cyclesPerHour = 60 / value;
    setEstimatedApiCalls(Math.round(postsPerFetch * enabledListsCount * cyclesPerHour));
    loadIngestionSettings();
  };

  const handlePostsPerFetchChange = (value: number) => {
    setPostsPerFetch(value);
    // Recalculate API rate
    const cyclesPerHour = 60 / ingestInterval;
    setEstimatedApiCalls(Math.round(value * enabledListsCount * cyclesPerHour));
  };

  const handlePostsPerFetchBlur = async () => {
    await settingsApi.update('posts_per_fetch', postsPerFetch.toString());
  };

  const handleSelectGroup = async (groupId: number) => {
    try {
      setIsSelecting(true);
      await groupsApi.select(groupId);
      await groupsApi.transition(groupId, 'COOKING');
      navigate('/cooking', { state: { selectedGroupId: groupId } });
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
    const filtered = groups.filter((g: Group) => {
      // Only show groups in NEW state (groups in COOKING/REVIEW/PUBLISHED are hidden from Menu)
      // Note: Groups still exist in DB for duplicate detection, just hidden from this view
      if (g.state && g.state !== 'NEW') {
        return false;
      }
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

    // Sort by selected option
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'worthiness':
          return (b.max_worthiness ?? 0) - (a.max_worthiness ?? 0);
        case 'sources':
          return b.post_count - a.post_count;
        case 'newest':
          return new Date(b.first_seen || 0).getTime() - new Date(a.first_seen || 0).getTime();
        default:
          return 0;
      }
    });
  }, [groups, selectedCategory, worthinessThreshold, minSourcesThreshold, sortBy]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Count groups that meet all filter criteria (including state=NEW)
    groups.forEach((g: Group) => {
      if (g.category) {
        const isNewState = !g.state || g.state === 'NEW';
        const meetsWorthiness = (g.max_worthiness ?? 0) >= worthinessThreshold;
        const meetsSources = g.post_count >= minSourcesThreshold;
        if (isNewState && meetsWorthiness && meetsSources) {
          counts[g.category] = (counts[g.category] || 0) + 1;
        }
      }
    });
    return counts;
  }, [groups, worthinessThreshold, minSourcesThreshold]);

  const totalVisibleCount = useMemo(() => {
    return groups.filter((g: Group) => {
      const isNewState = !g.state || g.state === 'NEW';
      const meetsWorthiness = (g.max_worthiness ?? 0) >= worthinessThreshold;
      const meetsSources = g.post_count >= minSourcesThreshold;
      return isNewState && meetsWorthiness && meetsSources;
    }).length;
  }, [groups, worthinessThreshold, minSourcesThreshold]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const handleIngestionComplete = () => {
    fetchData();
    loadIngestionSettings();
  };

  return (
    <>
      <CategoryNav
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        groupCounts={groupCounts}
        totalCount={totalVisibleCount}
      />
      <IngestionProgress onComplete={handleIngestionComplete} />
      <div className="page-with-sidebar">
        <FilterSidebar
          worthinessThreshold={worthinessThreshold}
          minSourcesThreshold={minSourcesThreshold}
          onWorthinessChange={setWorthinessThreshold}
          onMinSourcesChange={setMinSourcesThreshold}
          sortBy={sortBy}
          onSortChange={setSortBy}
          autoFetchEnabled={autoFetchEnabled}
          onToggleAutoFetch={handleToggleAutoFetch}
          onTriggerIngestion={handleTriggerIngestion}
          nextRunTime={nextRunTime}
          ingestInterval={ingestInterval}
          onIngestIntervalChange={handleIngestIntervalChange}
          postsPerFetch={postsPerFetch}
          onPostsPerFetchChange={handlePostsPerFetchChange}
          onPostsPerFetchBlur={handlePostsPerFetchBlur}
          estimatedApiCalls={estimatedApiCalls}
          enabledListsCount={enabledListsCount}
          operationFeedback={operationFeedback}
        />
        <div className="sidebar-main-content">
          <PostList
            groups={filteredGroups}
            onSelectGroup={handleSelectGroup}
            onArchiveGroup={handleArchiveGroup}
            isSelecting={isSelecting}
          />
        </div>
      </div>
    </>
  );
}

export default Home;
