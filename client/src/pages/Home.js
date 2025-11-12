import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import NewsTicker from '../components/Home/NewsTicker';
import SponsoredAds from '../components/Home/SponsoredAds';
import './Home.css';

const Home = () => {
  const { t } = useTranslation();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topBannerAds, setTopBannerAds] = useState([]);
  const [leftSidebarAds, setLeftSidebarAds] = useState([]);

  useEffect(() => {
    fetchAds();
    fetchSponsoredAds();
  }, []);

  const fetchAds = async () => {
    try {
      const response = await axios.get('/api/ads?status=published');
      setAds(response.data.ads || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSponsoredAds = async () => {
    try {
      const response = await axios.get('/api/admin/sponsored-ads');
      const sponsoredAds = response.data.sponsored_ads || [];
      setTopBannerAds(sponsoredAds.filter(ad => ad.position === 'top_banner' && ad.is_active));
      setLeftSidebarAds(sponsoredAds.filter(ad => ad.position === 'left_sidebar' && ad.is_active));
    } catch (error) {
      console.error('Error fetching sponsored ads:', error);
    }
  };

  return (
    <div className="home-page">
      {/* Top Banner Ads */}
      {topBannerAds.length > 0 && (
        <div className="top-banner">
          <SponsoredAds ads={topBannerAds} position="top" />
        </div>
      )}

      <div className="home-content">
        <div className="container">
          <div className="home-layout">
            {/* Left Sidebar - Sponsored Ads */}
            <aside className="left-sidebar">
              {leftSidebarAds.length > 0 && (
                <SponsoredAds ads={leftSidebarAds} position="left" />
              )}
              
              {/* User Info Panel (if authenticated) */}
              <div className="user-panel">
                <h3>{t('welcome')}</h3>
                <p>Explore fuel stations across Saudi Arabia</p>
                <Link to="/register" className="btn btn-primary">
                  {t('register')}
                </Link>
              </div>
            </aside>

            {/* Main Map Area */}
            <main className="map-container">
              <h2 className="section-title">{t('map')}</h2>
              {loading ? (
                <div className="loading">Loading map...</div>
              ) : (
                <MapComponent ads={ads} />
              )}
            </main>
          </div>
        </div>
      </div>

      {/* News Ticker */}
      <NewsTicker />
    </div>
  );
};

export default Home;



