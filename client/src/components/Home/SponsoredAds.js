import React from 'react';
import './SponsoredAds.css';

const SponsoredAds = ({ ads, position }) => {
  if (!ads || ads.length === 0) {
    return null;
  }

  return (
    <div className={`sponsored-ads sponsored-ads-${position}`}>
      {ads.map(ad => (
        <div key={ad.id} className="sponsored-ad-item">
          {ad.link_url ? (
            <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
              {ad.media_type === 'video' ? (
                <video src={ad.media_url} autoPlay muted loop playsInline />
              ) : (
                <img src={ad.media_url} alt={ad.title || 'Sponsored Ad'} />
              )}
            </a>
          ) : (
            <>
              {ad.media_type === 'video' ? (
                <video src={ad.media_url} autoPlay muted loop playsInline />
              ) : (
                <img src={ad.media_url} alt={ad.title || 'Sponsored Ad'} />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default SponsoredAds;



