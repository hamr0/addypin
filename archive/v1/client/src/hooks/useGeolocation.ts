import { useState, useEffect } from "react";

interface GeolocationState {
  location: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        location: null,
        error: {
          code: 0,
          message: "Geolocation not supported",
        } as GeolocationPositionError,
        loading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: position,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState({
          location: null,
          error,
          loading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  return state;
}
