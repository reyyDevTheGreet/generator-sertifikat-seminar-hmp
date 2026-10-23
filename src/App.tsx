import React, { useState, useEffect } from 'react';
import { CONFIG } from './config';
import { ParticipantPage } from './pages/ParticipantPage';
import { GalleryPage } from './pages/GalleryPage';
import { PanitiaPage } from './pages/PanitiaPage';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const normalizedPath = currentPath.replace(/\/+$/, '') || '/';
  const panitiaPath = `/${CONFIG.PANITIA_ROUTE_SLUG}`.replace(/\/+$/, '');

  if (normalizedPath === '/galeri') {
    return <GalleryPage />;
  }

  if (normalizedPath === panitiaPath) {
    return <PanitiaPage />;
  }

  return <ParticipantPage />;
}
