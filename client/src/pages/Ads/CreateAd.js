import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AdForm.css';

const CreateAd = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location_latitude: '',
    location_longitude: '',
    address: '',
    city: '',
    region: '',
    facilities: [],
    fuel_types: []
  });
  const [images, setImages] = useState([]);

  const facilitiesOptions = [
    'Restrooms', 'Shop', 'Restaurant', 'Car Wash', 'ATM', 
    'Prayer Room', 'Parking', 'Tire Service', 'Oil Change'
  ];

  const fuelTypesOptions = [
    '91 Octane', '95 Octane', 'Diesel', 'Premium Diesel'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCheckboxChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: formData[field].includes(value)
        ? formData[field].filter(item => item !== value)
        : [...formData[field], value]
    });
  };

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files));
  };

  const handleLocationSelect = () => {
    // This would integrate with Google Maps API to select location
    // For now, manual input
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location_latitude: position.coords.latitude,
            location_longitude: position.coords.longitude
          });
        },
        () => {
          toast.error('Unable to get your location');
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'facilities' || key === 'fuel_types') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      images.forEach((image, index) => {
        formDataToSend.append('images', image);
      });

      await axios.post('/api/ads', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Ad created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating ad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ad-form-page">
      <div className="container">
        <div className="ad-form-container">
          <h2>{t('create_ad')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('title')}</label>
              <input
                type="text"
                name="title"
                className="form-control"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('description')}</label>
              <textarea
                name="description"
                className="form-control"
                rows="4"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="location_latitude"
                  className="form-control"
                  value={formData.location_latitude}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="location_longitude"
                  className="form-control"
                  value={formData.location_longitude}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="button" onClick={handleLocationSelect} className="btn btn-outline mb-3">
              Use My Current Location
            </button>

            <div className="form-group">
              <label className="form-label">{t('address')}</label>
              <input
                type="text"
                name="address"
                className="form-control"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  name="city"
                  className="form-control"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Region</label>
                <input
                  type="text"
                  name="region"
                  className="form-control"
                  value={formData.region}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('facilities')}</label>
              <div className="checkbox-group">
                {facilitiesOptions.map(facility => (
                  <label key={facility} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.facilities.includes(facility)}
                      onChange={() => handleCheckboxChange('facilities', facility)}
                    />
                    {facility}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('fuel_types')}</label>
              <div className="checkbox-group">
                {fuelTypesOptions.map(type => (
                  <label key={type} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.fuel_types.includes(type)}
                      onChange={() => handleCheckboxChange('fuel_types', type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('images')}</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="form-control"
              />
              <small>You can upload up to 5 images</small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : t('submit')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-outline"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAd;


