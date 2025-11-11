import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Loading from '../../components/Common/Loading';
import './Blog.css';

const Blog = () => {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/blog');
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="blog-page">
      <div className="container">
        <h1>{t('blog')}</h1>
        {posts.length === 0 ? (
          <div className="empty-state">
            <p>No blog posts available yet.</p>
          </div>
        ) : (
          <div className="blog-posts">
            {posts.map(post => (
              <article key={post.id} className="blog-post-card">
                {post.media_url && (
                  <div className="blog-post-media">
                    {post.media_type === 'video' ? (
                      <video src={post.media_url} controls />
                    ) : (
                      <img src={post.media_url} alt={post.title} />
                    )}
                  </div>
                )}
                <div className="blog-post-content">
                  <h2>
                    {i18n.language === 'ar' && post.title_ar ? post.title_ar : post.title}
                  </h2>
                  <p className="blog-post-meta">
                    By {post.author_name} • {new Date(post.publish_date || post.created_at).toLocaleDateString()}
                  </p>
                  <p className="blog-post-excerpt">
                    {i18n.language === 'ar' && post.content_ar 
                      ? post.content_ar.substring(0, 200) + '...'
                      : post.content.substring(0, 200) + '...'}
                  </p>
                  <Link to={`/blog/${post.id}`} className="btn btn-outline">
                    Read More
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;


