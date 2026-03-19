import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

const API_URL = "https://api.cnviptravel.com";

interface MapContextType {
  mapInstance: any | null;
  mapboxToken: string | null;
  tokenError: string | null;
  setMapInstance: (instance: any) => void;
  refreshMapboxToken: () => Promise<void>;
  shouldLoadFromServer: boolean;
  refreshMapCache: () => void;
  isOfflineMode: boolean;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [mapInstance, setMapInstanceState] = useState<any | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [shouldLoadFromServer, setShouldLoadFromServer] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // FIX 1: mapInstance-г ref-д хадгалах — cleanup-д хэрэглэхэд null болохгүй
  const mapInstanceRef = useRef<any>(null);

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const checkShouldLoadFromServer = (): boolean => {
    try {
      const lastLoadWeek = localStorage.getItem('map_last_load_week');
      const currentWeek = getWeekNumber(new Date());
      return lastLoadWeek !== currentWeek.toString();
    } catch {
      return true;
    }
  };

  const refreshMapCache = (): void => {
    localStorage.removeItem('map_last_load_week');
    setShouldLoadFromServer(true);
  };

  const checkNetworkStatus = (): void => {
    setIsOfflineMode(!navigator.onLine);
  };

  const fetchMapboxToken = async (forceRefresh = false): Promise<void> => {
    try {
      if (!navigator.onLine) {
        const cachedToken = localStorage.getItem('mapbox_token');
        if (cachedToken) {
          setMapboxToken(cachedToken);
        } else {
          setTokenError('No cached token available for offline mode');
        }
        return;
      }

      const cachedToken = localStorage.getItem('mapbox_token');
      const tokenTimestamp = localStorage.getItem('mapbox_token_timestamp');
      const now = Date.now();
      const tokenValidDuration = 7 * 24 * 60 * 60 * 1000;

      if (!forceRefresh && cachedToken && tokenTimestamp && (now - parseInt(tokenTimestamp)) < tokenValidDuration) {
        setMapboxToken(cachedToken);
        return;
      }

      const response = await fetch(`${API_URL}/mapbox-token`);
      const data = await response.json() as any;

      if (data.token) {
        setMapboxToken(data.token);
        localStorage.setItem('mapbox_token', data.token);
        localStorage.setItem('mapbox_token_timestamp', now.toString());
        setTokenError(null);
      } else {
        setTokenError(data.error || 'Failed to load map token');
      }
    } catch (err) {
      console.error('Failed to fetch Mapbox token:', err);
      setTokenError('Failed to connect to server');
    }
  };

  const refreshMapboxToken = async (): Promise<void> => {
    await fetchMapboxToken(true);
  };

  // FIX 2: setMapInstance — state болон ref хоёуланд хадгалах
  const setMapInstance = (instance: any) => {
    mapInstanceRef.current = instance;
    setMapInstanceState(instance);
  };

  useEffect(() => {
    checkNetworkStatus();
    setShouldLoadFromServer(checkShouldLoadFromServer());
    fetchMapboxToken();

    window.addEventListener('online', checkNetworkStatus);
    window.addEventListener('offline', checkNetworkStatus);

    return () => {
      window.removeEventListener('online', checkNetworkStatus);
      window.removeEventListener('offline', checkNetworkStatus);
    };
  }, []);

  // FIX 3: moveend listener — ref ашиглан cleanup хийх
  useEffect(() => {
    if (!mapInstance) return;

    const saveViewport = () => {
      try {
        // FIX: ref-ээр шалгах — state null болсон байж болно
        const map = mapInstanceRef.current;
        if (!map) return;

        const center = map.getCenter();
        const zoom = map.getZoom();
        localStorage.setItem('map_viewport', JSON.stringify({
          latitude: center.lat,
          longitude: center.lng,
          zoom
        }));
      } catch (error) {
        console.error('Failed to save viewport:', error);
      }
    };

    mapInstance.on('moveend', saveViewport);

    // FIX: closure-д mapInstance-г capture хийх — ref биш
    const capturedInstance = mapInstance;
    return () => {
      try {
        capturedInstance.off('moveend', saveViewport);
      } catch (e) {
        // Map аль хэдийн устсан байж болно — дарна
      }
    };
  }, [mapInstance]);

  // FIX 4: viewport restore-г УСТГА — энэ нь цагаан дэлгэцийн гол шалтгаан байсан
  // EnhancedMapView өөрөө localStorage-аас viewport уншдаг тул давхардаж байсан
  // Мөн mapInstance ирэхэд map бэлэн болоогүй байвал flyTo crash өгдөг байсан
  // useEffect(() => {
  //   if (!mapInstance) return;
  //   mapInstance.flyTo(...) ← УСТГАСАН
  // }, [mapInstance]);

  const value: MapContextType = {
    mapInstance,
    mapboxToken,
    tokenError,
    setMapInstance,
    refreshMapboxToken,
    shouldLoadFromServer,
    refreshMapCache,
    isOfflineMode
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = (): MapContextType => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};