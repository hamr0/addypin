// Simple session tracking for analytics
export function getOrCreateSessionId(): string {
  const existingSession = sessionStorage.getItem('addypin_session_id');
  if (existingSession) {
    return existingSession;
  }

  // Generate a simple session ID
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem('addypin_session_id', sessionId);
  return sessionId;
}

// Track page visits for analytics
export async function trackPageVisit(page: string) {
  try {
    const sessionId = getOrCreateSessionId();
    
    // Note: /api/analytics/visit endpoint doesn't exist - commenting out to fix fetch errors
    // Send a simple visit tracking event
    // await fetch('/api/analytics/visit', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     page,
    //     sessionId,
    //     timestamp: new Date().toISOString(),
    //   }),
    // });
  } catch (error) {
    // Silently fail analytics - don't break user experience
    console.warn('Analytics tracking failed:', error);
  }
}