/**
 * Home page - displays groups (V-5 group-centric view)
 */
import { useState, useEffect } from 'react';
import { Group } from '../types';
import { groupsApi } from '../services/api';
import PostList from '../components/PostList';

function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsApi.getAll();
      setGroups(response.data.groups || []);
      setError(null);
    } catch (err) {
      setError('Failed to load groups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = async (groupId: number) => {
    try {
      await groupsApi.select(groupId);
      // TODO: Navigate to article generation view with group_id
      console.log('Selected group:', groupId);
    } catch (err) {
      console.error('Failed to select group:', err);
    }
  };

  const handleArchiveGroup = async (groupId: number) => {
    try {
      await groupsApi.archive(groupId);
      // Remove from local state
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (err) {
      console.error('Failed to archive group:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="home-page">
      <h2>News Stories</h2>
      <PostList
        groups={groups}
        onSelectGroup={handleSelectGroup}
        onArchiveGroup={handleArchiveGroup}
      />
    </div>
  );
}

export default Home;
