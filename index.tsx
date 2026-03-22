import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Canvas2D: 僅對 Ketcher 等需頻繁讀取的套件加上 willReadFrequently，避免 GPU Canvas 被降級
import { applyCanvasPatch } from './canvasPatch';
applyCanvasPatch();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global console warning suppression for specific library quirks
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && (
      args[0].includes('quirks mode') || 
      args[0].includes('No character metrics') ||
      args[0].includes('Expected property name') ||
      args[0].includes('width(-1)') || 
      args[0].includes('height(-1)') ||
      args[0].includes('width(0)') || 
      args[0].includes('height(0)') ||
      args[0].includes('willReadFrequently') ||
      args[0].includes('getImageData')
  )) return;
  originalWarn.apply(console, args);
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
