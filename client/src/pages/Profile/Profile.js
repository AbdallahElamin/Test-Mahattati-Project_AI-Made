import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/Common/Loading';
import './Profile.css';

const Profile = () => {
  const { t, i18n } = useTranslation();
  const { user: authUser, fetchUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company_name: '',
    language_preference: 'ar'
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile');
      setUser(response.data.user);
      setFormData({
        name: response.data.user.name || '',
        phone: response.data.user.phone || '',
        company_name: response.data.user.company_name || '',
        language_preference: response.data.user.language_preference || 'ar'
      });
    } catch (error) {
      toast.error('Error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/users/profile', formData);
      toast.success('Profile updated successfully');
      setEditing(false);
      fetchProfile();
      fetchUser(); // Update auth context
      if (formData.language_preference !== i18n.language) {
        i18n.changeLanguage(formData.language_preference);
      }
    } catch (error) {
      toast.error('Error updating profile');
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <div className="container">User not found</div>;
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-container">
          <div className="profile-header">
            <h1>{t('profile')}</h1>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn btn-primary">
                {t('edit')}
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label className="form-label">{t('name')}</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('email')}</label>
                <input
                  type="email"
                  className="form-control"
                  value={user.email}
                  disabled
                />
                <small>Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label className="form-label">{t('phone')}</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {user.role === 'subscriber' && (
                <div className="form-group">
                  <label className="form-label">{t('company_name')}</label>
                  <input
                    type="text"
                    name="company_name"
                    className="form-control"
                    value={formData.company_name}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Language Preference</label>
                <select
                  name="language_preference"
                  className="form-control"
                  value={formData.language_preference}
                  onChange={handleChange}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    fetchProfile();
                  }}
                  className="btn btn-outline"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-item">
                <strong>{t('name')}:</strong> {user.name}
              </div>
              <div className="info-item">
                <strong>{t('email')}:</strong> {user.email}
              </div>
              {user.phone && (
                <div className="info-item">
                  <strong>{t('phone')}:</strong> {user.phone}
                </div>
              )}
              {user.company_name && (
                <div className="info-item">
                  <strong>{t('company_name')}:</strong> {user.company_name}
                </div>
              )}
              <div className="info-item">
                <strong>Role:</strong> {user.role}
              </div>
              <div className="info-item">
                <strong>Language:</strong> {user.language_preference === 'ar' ? 'العربية' : 'English'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;



