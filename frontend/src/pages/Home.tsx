/**
 * Home page - displays groups (V-5 group-centric view)
 */
import { useState, useEffect } from 'react';
import { Post, Group } from '../types';
import { groupsApi, postsApi } from '../services/api';
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

  const handleSelectPost = async (post: Post) => {
    try {
      await postsApi.selectPost(post.id);
      // TODO: Navigate to article generation view
      console.log('Selected post:', post);
    } catch (err) {
      console.error('Failed to select post:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="home-page">
      <h2>News Stories</h2>
      <PostList groups={groups} onSelectPost={handleSelectPost} />
    </div>
  );
}

export default Home;
