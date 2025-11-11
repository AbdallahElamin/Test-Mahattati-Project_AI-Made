import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NewsTicker.css';

const NewsTicker = () => {
  const [news, setNews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await axios.get('/api/news-ticker');
      const activeNews = (response.data.news || []).filter(item => item.is_active);
      setNews(activeNews);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
      }, 5000); // Change news every 5 seconds

      return () => clearInterval(interval);
    }
  }, [news.length]);

  if (news.length === 0) {
    return null;
  }

  const currentNews = news[currentIndex];

  return (
    <div className="news-ticker">
      <div className="news-ticker-label">News:</div>
      <div className="news-ticker-content">
        {currentNews.link_url ? (
          <a href={currentNews.link_url} target="_blank" rel="noopener noreferrer">
            {currentNews.content || currentNews.content_ar}
          </a>
        ) : (
          <span>{currentNews.content || currentNews.content_ar}</span>
        )}
      </div>
    </div>
  );
};

export default NewsTicker;


