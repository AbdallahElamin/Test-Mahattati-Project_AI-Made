import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <h1>محطاتي | Mahattati</h1>
          </Link>

          <div className="navbar-menu">
            <Link to="/" className="nav-link">{t('dashboard')}</Link>
            <Link to="/blog" className="nav-link">{t('blog')}</Link>
            
            {isAuthenticated ? (
              <>
                {user.role === 'advertiser' && (
                  <Link to="/ads/create" className="nav-link">{t('create_ad')}</Link>
                )}
                <Link to="/messages" className="nav-link">
                  {t('messages')}
                  {/* Add notification badge if needed */}
                </Link>
                <Link to="/profile" className="nav-link">{t('profile')}</Link>
                {(user.role === 'system_manager' || user.role === 'marketing_manager') && (
                  <Link to="/dashboard" className="nav-link">{t('admin')}</Link>
                )}
                <button onClick={handleLogout} className="btn btn-outline">
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">{t('login')}</Link>
                <Link to="/register" className="btn btn-primary">{t('register')}</Link>
              </>
            )}

            <div className="language-switcher">
              <button
                onClick={() => changeLanguage('ar')}
                className={i18n.language === 'ar' ? 'active' : ''}
              >
                عربي
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={i18n.language === 'en' ? 'active' : ''}
              >
                English
              </button>
            </div>
          </div>

          <button 
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            <Link to="/" onClick={() => setMenuOpen(false)}>{t('dashboard')}</Link>
            <Link to="/blog" onClick={() => setMenuOpen(false)}>{t('blog')}</Link>
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)}>{t('profile')}</Link>
                <Link to="/messages" onClick={() => setMenuOpen(false)}>{t('messages')}</Link>
                <button onClick={handleLogout}>{t('logout')}</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)}>{t('login')}</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)}>{t('register')}</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;


