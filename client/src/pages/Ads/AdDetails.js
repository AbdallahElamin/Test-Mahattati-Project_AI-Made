import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/Common/Loading';
import './AdDetails.css';

const AdDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [ad, setAd] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchAd();
    fetchComments();
  }, [id]);

  const fetchAd = async () => {
    try {
      const response = await axios.get(`/api/ads/${id}`);
      setAd(response.data.ad);
    } catch (error) {
      toast.error('Error fetching ad');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`/api/comments/${id}`);
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await axios.post('/api/comments', {
        ad_id: id,
        content: commentText
      });
      setCommentText('');
      fetchComments();
      toast.success('Comment added');
    } catch (error) {
      toast.error('Error adding comment');
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!ad) {
    return <div className="container">Ad not found</div>;
  }

  return (
    <div className="ad-details-page">
      <div className="container">
        <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>

        <div className="ad-details">
          <div className="ad-header">
            <h1>{ad.title}</h1>
            <span className={`status-badge status-${ad.status}`}>{ad.status}</span>
          </div>

          {ad.images && ad.images.length > 0 && (
            <div className="ad-images">
              {ad.images.map((image, index) => (
                <img key={index} src={image} alt={`${ad.title} - ${index + 1}`} />
              ))}
            </div>
          )}

          <div className="ad-content">
            <div className="ad-info">
              <h2>Details</h2>
              {ad.description && <p>{ad.description}</p>}
              
              <div className="info-item">
                <strong>Location:</strong> {ad.address || `${ad.city}, ${ad.region}`}
              </div>

              {ad.facilities && ad.facilities.length > 0 && (
                <div className="info-item">
                  <strong>Facilities:</strong> {ad.facilities.join(', ')}
                </div>
              )}

              {ad.fuel_types && ad.fuel_types.length > 0 && (
                <div className="info-item">
                  <strong>Fuel Types:</strong> {ad.fuel_types.join(', ')}
                </div>
              )}

              <div className="info-item">
                <strong>Views:</strong> {ad.views_count || 0}
              </div>
            </div>

            <div className="ad-comments">
              <h2>Comments</h2>
              
              {user && (
                <form onSubmit={handleCommentSubmit} className="comment-form">
                  <textarea
                    className="form-control"
                    rows="3"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                  />
                  <button type="submit" className="btn btn-primary mt-2">
                    Post Comment
                  </button>
                </form>
              )}

              <div className="comments-list">
                {comments.length === 0 ? (
                  <p>No comments yet.</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <strong>{comment.user_name}</strong>
                        <span className="comment-date">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdDetails;

