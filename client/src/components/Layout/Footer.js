import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>محطاتي | Mahattati</h3>
            <p>منصة إعلانات محطات الوقود في المملكة العربية السعودية</p>
            <p>Fuel Station Advertising Platform in Saudi Arabia</p>
          </div>
          
          <div className="footer-section">
            <h4>{t('settings')}</h4>
            <Link to="/about">About</Link>
            <Link to="/legal">Legal</Link>
            <Link to="/contact">Contact</Link>
          </div>
          
          <div className="footer-section">
            <h4>Links</h4>
            <Link to="/blog">{t('blog')}</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Mahattati. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


