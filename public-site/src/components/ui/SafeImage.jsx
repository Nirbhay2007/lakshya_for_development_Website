import React, { useState, useEffect } from 'react';

const SafeImage = ({ src, alt = '', className = '', fallbackSrc, priority = false, ...props }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isError, setIsError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Try to find a blurhash placeholder for this image
  const blurhash = typeof window !== 'undefined' && window.__BLURHASHES__ ? window.__BLURHASHES__[src] : null;

  useEffect(() => {
    setImgSrc(src);
    setIsError(false);
    setIsLoaded(false);
  }, [src]);

  const handleError = () => {
    if (isError) return;
    setIsError(true);
    if (fallbackSrc) {
      setImgSrc(fallbackSrc);
    } else {
      setImgSrc('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23f5efe6"/><path d="M150 90 C 130 90, 120 110, 120 125 C 120 150, 160 175, 200 200 C 240 175, 280 150, 280 125 C 280 110, 270 90, 250 90 C 235 90, 215 105, 200 120 C 185 105, 165 90, 150 90 Z" fill="%232e7d32" opacity="0.12"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="14" fill="%232e7d32" opacity="0.6">Lakshya Society</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%232e7d32" opacity="0.4">Image Unavailable</text></svg>');
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const finalSrc = imgSrc || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23f5efe6"/><path d="M150 90 C 130 90, 120 110, 120 125 C 120 150, 160 175, 200 200 C 240 175, 280 150, 280 125 C 280 110, 270 90, 250 90 C 235 90, 215 105, 200 120 C 185 105, 165 90, 150 90 Z" fill="%232e7d32" opacity="0.12"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="14" fill="%232e7d32" opacity="0.6">Lakshya Society</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%232e7d32" opacity="0.4">Image Unavailable</text></svg>';

  // If we have a blurhash, wrap it in a container that shows the blurhash underneath
  if (blurhash && !isError) {
    // Determine object-fit behavior from className, defaulting to cover
    const isContain = className.includes('object-contain');
    const objectFit = isContain ? 'contain' : 'cover';

    return (
      <div 
        className={`relative overflow-hidden ${className}`}
        style={{
          backgroundImage: `url(${blurhash})`,
          backgroundSize: objectFit,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <img
          src={finalSrc}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-${objectFit} transition-opacity duration-700 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onError={handleError}
          onLoad={handleLoad}
          loading={priority ? undefined : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          {...props}
        />
      </div>
    );
  }

  // Standard fallback if no blurhash is available
  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading={priority ? undefined : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      {...props}
    />
  );
};

export default SafeImage;
