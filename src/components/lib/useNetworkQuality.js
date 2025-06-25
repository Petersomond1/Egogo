import { useState, useEffect } from 'react';

export const useNetworkQuality = () => {
  const [quality, setQuality] = useState('unknown');
  const [adjustments, setAdjustments] = useState({
    imageQuality: 0.8,
    videoQuality: 0.7,
    enableCompression: true
  });

  useEffect(() => {
    // Detect network quality using Navigator API
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      const updateQuality = () => {
        const effectiveType = connection.effectiveType;
        let newQuality = 'unknown';
        let newAdjustments = { ...adjustments };

        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            newQuality = 'poor';
            newAdjustments = {
              imageQuality: 0.5,
              videoQuality: 0.3,
              enableCompression: true
            };
            break;
          case '3g':
            newQuality = 'moderate';
            newAdjustments = {
              imageQuality: 0.7,
              videoQuality: 0.5,
              enableCompression: true
            };
            break;
          case '4g':
          default:
            newQuality = 'good';
            newAdjustments = {
              imageQuality: 0.8,
              videoQuality: 0.7,
              enableCompression: false
            };
            break;
        }

        setQuality(newQuality);
        setAdjustments(newAdjustments);
      };

      updateQuality();
      connection.addEventListener('change', updateQuality);

      return () => {
        connection.removeEventListener('change', updateQuality);
      };
    } else {
      // Fallback for browsers without connection API
      setQuality('good');
      setAdjustments({
        imageQuality: 0.8,
        videoQuality: 0.7,
        enableCompression: false
      });
    }
  }, []); // Remove adjustments from dependency array to prevent infinite loop

  return { quality, adjustments };
};