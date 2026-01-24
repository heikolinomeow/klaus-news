/**
 * Home page - displays recommended and all posts
 */
import { useState, useEffect } from 'react';
import { Post } from '../types';
import { postsApi } from '../services/api';
import PostList from '../components/PostList';

function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'recommended' | 'all'>('recommended');

  useEffect(() => {
    fetchPosts();
  }, [view]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = view === 'recommended'
        ? await postsApi.getRecommended()
        : await postsApi.getAll();

      // Recommended returns {category: [posts]}, All returns {posts: []}
      if (view === 'recommended') {
        const grouped = response.data;
        const flatPosts: Post[] = [];
        Object.keys(grouped).forEach(category => {
          const categoryPosts = grouped[category];
          if (Array.isArray(categoryPosts)) {
            flatPosts.push(...categoryPosts);
          }
        });
        setPosts(flatPosts);
      } else {
        setPosts(response.data.posts || []);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load posts');
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
      <div className="view-toggle">
        <button
          className={view === 'recommended' ? 'active' : ''}
          onClick={() => setView('recommended')}
        >
          Recommended
        </button>
        <button
          className={view === 'all' ? 'active' : ''}
          onClick={() => setView('all')}
        >
          All Posts
        </button>
      </div>
      <PostList posts={posts} onSelectPost={handleSelectPost} />
    </div>
  );
}

export default Home;
