import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useAuth } from '../../context/AuthContext';
import './MapComponent.css';

const MapComponent = ({ ads = [] }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const { user } = useAuth();
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (!apiKey) {
      console.error('Google Maps API key is not set');
      return;
    }

    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      const google = window.google;
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 24.7136, lng: 46.6753 }, // Riyadh, Saudi Arabia
        zoom: 6,
        mapTypeControl: true,
        streetViewControl: false
      });

      setMap(mapInstance);

      // Add markers for ads
      const newMarkers = ads.map(ad => {
        const marker = new google.maps.Marker({
          position: {
            lat: parseFloat(ad.location_latitude),
            lng: parseFloat(ad.location_longitude)
          },
          map: mapInstance,
          title: ad.title
        });

        // Create info window based on user role
        const infoContent = user?.role === 'subscriber' ? (
          `<div class="map-info-window">
            <h3>${ad.title}</h3>
            <p>${ad.description || ''}</p>
            <p><strong>Location:</strong> ${ad.address || ad.city || ''}</p>
            ${ad.facilities && Array.isArray(ad.facilities) ? (
              `<p><strong>Facilities:</strong> ${ad.facilities.join(', ')}</p>`
            ) : ''}
            ${ad.fuel_types && Array.isArray(ad.fuel_types) ? (
              `<p><strong>Fuel Types:</strong> ${ad.fuel_types.join(', ')}</p>`
            ) : ''}
          </div>`
        ) : (
          `<div class="map-info-window">
            <h3>${ad.title}</h3>
            <p>Location: ${ad.address || ad.city || ''}</p>
          </div>`
        );

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance, marker);
        });

        return marker;
      });

      setMarkers(newMarkers);
    });
  }, [apiKey, ads, user]);

  return (
    <div className="map-container-wrapper">
      <div ref={mapRef} className="map" style={{ height: '600px', width: '100%' }} />
    </div>
  );
};

export default MapComponent;



