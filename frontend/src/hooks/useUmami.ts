import { useEffect } from 'react';

// Umami client-side tracking hook
export function useUmami() {
  useEffect(() => {
    // Only track if Umami is configured
    if (!import.meta.env.VITE_UMAMI_WEBSITE_ID || !import.meta.env.VITE_UMAMI_URL) {
      return;
    }

    // Load Umami tracking script
    const script = document.createElement('script');
    script.async = true;
    script.src = `${import.meta.env.VITE_UMAMI_URL}/umami.js`;
    script.setAttribute('data-website-id', import.meta.env.VITE_UMAMI_WEBSITE_ID);
    script.setAttribute('data-domains', window.location.hostname);
    
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      document.head.removeChild(script);
    };
  }, []);

  // Helper function to track custom events
  const track = (eventName: string, eventData?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track(eventName, eventData);
    }
  };

  return { track };
}

// Extend window type for TypeScript
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void;
    };
  }
}