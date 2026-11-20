import React from 'react';
import { useApp } from '../../context/AppContext';

export const Toast: React.FC = () => {
  const { toastMessage, toastVisible } = useApp();

  return (
    <div
      id="toast"
      className={`fixed bottom-5 right-5 z-50 bg-amber-500 text-slate-950 px-4 py-3 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 transform transition-all duration-300 ${
        toastVisible ? '' : 'hidden'
      }`}
      role="status"
      aria-live="polite"
    >
      <i className="fa-solid fa-circle-check text-slate-950 ae-icon-polished" />
      <span id="toast-msg">{toastMessage}</span>
    </div>
  );
};
