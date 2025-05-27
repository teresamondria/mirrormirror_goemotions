// popup.tsx — React entry point for popup.html
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './popupComponent';

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);

