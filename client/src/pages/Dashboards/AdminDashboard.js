import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const isSystemManager = user?.role === 'system_manager';
  const isMarketingManager = user?.role === 'marketing_manager';

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
        </div>

        <div className="admin-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          {isSystemManager && (
            <>
              <button
                className={activeTab === 'users' ? 'active' : ''}
                onClick={() => setActiveTab('users')}
              >
                {t('users')}
              </button>
              <button
                className={activeTab === 'reports' ? 'active' : ''}
                onClick={() => setActiveTab('reports')}
              >
                {t('reports')}
              </button>
              <button
                className={activeTab === 'logs' ? 'active' : ''}
                onClick={() => setActiveTab('logs')}
              >
                {t('logs')}
              </button>
            </>
          )}
          {(isSystemManager || isMarketingManager) && (
            <>
              <button
                className={activeTab === 'blog' ? 'active' : ''}
                onClick={() => setActiveTab('blog')}
              >
                {t('blog')}
              </button>
              <button
                className={activeTab === 'sponsored-ads' ? 'active' : ''}
                onClick={() => setActiveTab('sponsored-ads')}
              >
                Sponsored Ads
              </button>
            </>
          )}
        </div>

        <div className="admin-content">
          {activeTab === 'overview' && (
            <div className="admin-section">
              <h2>Welcome, {user?.name}</h2>
              <p>You are logged in as: {user?.role}</p>
              {/* Add overview stats here */}
            </div>
          )}

          {activeTab === 'users' && isSystemManager && (
            <div className="admin-section">
              <h2>User Management</h2>
              <p>User management interface will be implemented here.</p>
            </div>
          )}

          {activeTab === 'reports' && isSystemManager && (
            <div className="admin-section">
              <h2>Reports</h2>
              <p>Reports interface will be implemented here.</p>
            </div>
          )}

          {activeTab === 'logs' && isSystemManager && (
            <div className="admin-section">
              <h2>System Logs</h2>
              <p>Logs interface will be implemented here.</p>
            </div>
          )}

          {activeTab === 'blog' && (isSystemManager || isMarketingManager) && (
            <div className="admin-section">
              <h2>Blog Management</h2>
              <p>Blog management interface will be implemented here.</p>
            </div>
          )}

          {activeTab === 'sponsored-ads' && (isSystemManager || isMarketingManager) && (
            <div className="admin-section">
              <h2>Sponsored Ads Management</h2>
              <p>Sponsored ads management interface will be implemented here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


