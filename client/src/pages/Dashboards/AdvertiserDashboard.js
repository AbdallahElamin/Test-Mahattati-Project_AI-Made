import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/Common/Loading';
import './Dashboard.css';

const AdvertiserDashboard = () => {
  const { t } = useTranslation();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAds: 0,
    publishedAds: 0,
    totalViews: 0,
    totalMessages: 0
  });

  useEffect(() => {
    fetchAds();
    fetchStats();
  }, []);

  const fetchAds = async () => {
    try {
      const response = await axios.get('/api/ads');
      setAds(response.data.ads || []);
    } catch (error) {
      toast.error('Error fetching ads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const adsResponse = await axios.get('/api/ads');
      const allAds = adsResponse.data.ads || [];
      const published = allAds.filter(ad => ad.status === 'published');
      const totalViews = allAds.reduce((sum, ad) => sum + (ad.views_count || 0), 0);

      const messagesResponse = await axios.get('/api/messages');
      const conversations = messagesResponse.data.conversations || [];
      const totalMessages = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

      setStats({
        totalAds: allAds.length,
        publishedAds: published.length,
        totalViews,
        totalMessages
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeleteAd = async (adId) => {
    if (window.confirm('Are you sure you want to delete this ad?')) {
      try {
        await axios.delete(`/api/ads/${adId}`);
        toast.success('Ad deleted successfully');
        fetchAds();
      } catch (error) {
        toast.error('Error deleting ad');
      }
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>{t('dashboard')}</h1>
          <Link to="/ads/create" className="btn btn-primary">
            {t('create_ad')}
          </Link>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>{stats.totalAds}</h3>
            <p>Total Ads</p>
          </div>
          <div className="stat-card">
            <h3>{stats.publishedAds}</h3>
            <p>Published Ads</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalViews}</h3>
            <p>Total Views</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalMessages}</h3>
            <p>Unread Messages</p>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>My Ads</h2>
          {ads.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any ads yet.</p>
              <Link to="/ads/create" className="btn btn-primary">
                {t('create_ad')}
              </Link>
            </div>
          ) : (
            <div className="ads-list">
              {ads.map(ad => (
                <div key={ad.id} className="ad-card">
                  <div className="ad-card-content">
                    <h3>{ad.title}</h3>
                    <p className="ad-status">Status: {ad.status}</p>
                    <p className="ad-views">Views: {ad.views_count || 0}</p>
                    {ad.address && <p className="ad-location">{ad.address}</p>}
                  </div>
                  <div className="ad-card-actions">
                    <Link to={`/ads/${ad.id}`} className="btn btn-outline">
                      {t('edit')}
                    </Link>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="btn btn-danger"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvertiserDashboard;



