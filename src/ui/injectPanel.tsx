// injectPanel.tsx — Entry point for injecting the YouTubePanel React app into the YouTube sidebar
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { YouTubePanel } from './YouTubePanel';

const PANEL_ID = 'mirrormirror-youtube-panel';

function mountPanel() {
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    // Find the right sidebar (where related videos are listed)
    const secondary = document.getElementById('secondary');
    if (!secondary) return;
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    secondary.prepend(panel);
  }
  const root = createRoot(panel);
  root.render(<YouTubePanel />);
}

mountPanel(); 