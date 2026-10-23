import React from 'react';
import { createPortal } from 'react-dom';

interface PrintPortalProps {
  children: React.ReactNode;
}

export const PrintPortal: React.FC<PrintPortalProps> = ({ children }) => {
  const mount = document.getElementById('print-portal-root') || document.body;
  return createPortal(children, mount);
};
