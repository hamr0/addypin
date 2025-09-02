import { createRoot } from "react-dom/client";
import { ClerkProvider } from '@clerk/clerk-react';
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_bXVzaWNhbC13YWxsZXllLTc5LmNsZXJrLmFjY291bnRzLmRldiQ";

// Add error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Check if this is a Clerk-related error and suppress it in development
  if (event.reason && event.reason.message && event.reason.message.includes('clerk')) {
    console.warn('Suppressed Clerk error:', event.reason);
    event.preventDefault();
  }
});

function AppWithClerk() {
  try {
    if (!PUBLISHABLE_KEY) {
      console.warn("Missing Clerk Publishable Key - running without authentication");
      return <App />;
    }

    return (
      <ClerkProvider 
        publishableKey={PUBLISHABLE_KEY}
        appearance={{
          elements: {
            footer: "hidden"
          }
        }}
      >
        <App />
      </ClerkProvider>
    );
  } catch (error) {
    console.warn("Clerk initialization failed, running without authentication:", error);
    return <App />;
  }
}

createRoot(document.getElementById("root")!).render(<AppWithClerk />);
