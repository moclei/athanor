import React from 'react';
import { createRoot } from 'react-dom/client';
import { GalleryApp } from '../ui/gallery/App';

const mount = document.getElementById('root');
if (!mount) throw new Error('Freehold gallery: #root element missing');

createRoot(mount).render(<GalleryApp />);
