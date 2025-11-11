import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/Common/Loading';
import MapComponent from '../../components/Map/MapComponent';
import './Dashboard.css';

const SubscriberDashboard = () => {
  const { t } = useTranslation();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    region: '',
    city: '',
    nearMe: false
  });

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchAds();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get('/api/subscriptions/status');
      setSubscription(response.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchAds = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchFilters.region) params.region = searchFilters.region;
      if (searchFilters.city) params.city = searchFilters.city;
      if (searchFilters.nearMe && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            params.latitude = position.coords.latitude;
            params.longitude = position.coords.longitude;
            params.radius = 50; // 50km radius
            performSearch(params);
          },
          () => {
            toast.error('Unable to get your location');
            performSearch(params);
          }
        );
      } else {
        performSearch(params);
      }
    } catch (error) {
      toast.error('Error fetching ads');
      setLoading(false);
    }
  };

  const performSearch = async (params) => {
    try {
      const response = await axios.get('/api/ads', { params });
      setAds(response.data.ads || []);
    } catch (error) {
      toast.error('Error searching ads');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchFilters({
      ...searchFilters,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAds();
  };

  const saudiRegions = [
    'Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Qassim', 
    'Asir', 'Tabuk', 'Hail', 'Northern Borders', 'Jazan', 
    'Najran', 'Al Baha', 'Al Jawf'
  ];

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>{t('dashboard')}</h1>
          {subscription && !subscription.active && (
            <div className="subscription-warning">
              <p>Your subscription has expired. <Link to="/subscription">Renew now</Link></p>
            </div>
          )}
        </div>

        {subscription && subscription.active ? (
          <>
            <div className="search-section">
              <form onSubmit={handleSearch} className="search-form">
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <select
                    name="region"
                    className="form-control"
                    value={searchFilters.region}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Regions</option>
                    {saudiRegions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="form-control"
                    value={searchFilters.city}
                    onChange={handleFilterChange}
                    placeholder="Enter city name"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="nearMe"
                      checked={searchFilters.nearMe}
                      onChange={handleFilterChange}
                    />
                    {' '}Near Me
                  </label>
                </div>

                <button type="submit" className="btn btn-primary">
                  {t('search')}
                </button>
              </form>
            </div>

            <div className="map-section">
              <h2>Fuel Stations Map</h2>
              {loading ? (
                <Loading />
              ) : (
                <MapComponent ads={ads} />
              )}
              <p className="results-count">Found {ads.length} station(s)</p>
            </div>
          </>
        ) : (
          <div className="subscription-required">
            <h2>Subscription Required</h2>
            <p>You need an active subscription to access detailed fuel station information.</p>
            <Link to="/subscription" className="btn btn-primary">
              Subscribe Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriberDashboard;

