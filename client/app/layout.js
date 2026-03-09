'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import useStore from '@/store/useStore';
import './globals.css';

export default function RootLayout({ children }) {
  const darkMode = useStore((s) => s.darkMode);

  useEffect(() => {
    const setHydrated = useStore.getState().setHydrated;
    const unsub = useStore.persist?.onFinishHydration?.(() => {
      setHydrated?.(true);
    });
    const fallback = setTimeout(() => {
      setHydrated?.(true);
    }, 250);
    return () => {
      unsub?.();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>ChatApp - Real-time Messaging</title>
        <meta name="description" content="Real-time encrypted messaging application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: darkMode ? '#1e293b' : '#fff',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
