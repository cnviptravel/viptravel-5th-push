import React, { useState, useRef, useMemo, useEffect, Suspense, useContext, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl';
import Supercluster from 'supercluster';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiUpdateProfile, apiLogFrontendUsage } from '../services/api';
import { useMap } from '../contexts/MapContext';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useSnackbar } from '../contexts/SnackbarContext';

interface EnhancedMapViewProps {
  users: User[];
  markerColor?: string;
  showLocationSaveButton?: boolean;
  showRealTimeTracking?: boolean;
  followMode?: boolean;
}

const EnhancedMapView: React.FC<EnhancedMapViewProps> = ({ 
  users, 
  markerColor = '#f97316', 
  showLocationSaveButton = false,
  showRealTimeTracking = false, // Default нь false байх ёстой
  followMode = false
}) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { auth, setAuth } = useContext(AuthContext);
  const { 
    mapboxToken, 
    tokenError, 
    setMapInstance,
    shouldLoadFromServer,
    refreshMapCache,
    isOfflineMode
  } = useMap();
  
  // State management - Save viewport to localStorage
  const [viewport, setViewport] = useState(() => {
    const savedViewport = localStorage.getItem('map_viewport');
    if (savedViewport) {
      try {
        return JSON.parse(savedViewport);
      } catch (e) {
        console.error('Failed to parse saved viewport:', e);
      }
    }
    return {
      latitude: 47.9221,
      longitude: 106.9155,
      zoom: 5
    };
  });

  // Save viewport to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('map_viewport', JSON.stringify(viewport));
  }, [viewport]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, heading?: number} | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLocationFound, setShowLocationFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(followMode);
  const [userAddress, setUserAddress] = useState<string>('');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Refs
  const mapRef = useRef<any>(null);
  const geolocateRef = useRef<any>(null);
  const lastGeocodeTime = useRef<number>(0);
  const geocodeDebounceRef = useRef<any>(null);

  // Save map instance to global context and track map load
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    
    const map = mapRef.current.getMap();
    setMapInstance(map);
    
    // Track map load (only once per week)
    const handleMapLoad = () => {
      if (shouldLoadFromServer) {
        // This is the first map load this week, record it
        const currentWeek = getWeekNumber(new Date());
        localStorage.setItem('map_last_load_week', currentWeek.toString());
        console.log('Map loaded from server (weekly cache)');
      } else {
        console.log('Map loaded from cache');
      }
    };
    
    map.on('load', handleMapLoad);
    
    // Cleanup function
    return () => {
      if (map) {
        map.off('load', handleMapLoad);
      }
    };
  }, [mapLoaded, setMapInstance, shouldLoadFromServer]);

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Set map instance when component mounts, cleanup when unmounts
  useEffect(() => {
    return () => {
      // Clean up map instance when component unmounts
      setMapInstance(null);
      setMapLoaded(false);
    };
  }, [setMapInstance]);

  // Custom debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Reverse geocoding API call-ыг debounce хийх
  const reverseGeocode = useCallback(
    debounce(async (lat: number, lng: number) => {
      // API call-ыг хязгаарлах: секундэд 1 удаа л дуудах
      const now = Date.now();
      if (now - lastGeocodeTime.current < 1000) return;
      
      lastGeocodeTime.current = now;
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address&limit=1`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          setUserAddress(data.features[0].place_name);
          // Mapbox geocoding log
          apiLogFrontendUsage('mapbox_geocoding', 'reverse_geocode', 1);
        }
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
      }
    }, 1000),
    [mapboxToken]
  );

  // 2. GOOGLE MAPS ШИГ МЭДРЭМЖ

  // Хэрэглэгчийн байршлын өнгө role-оор тодорхойлох
  const getUserLocationColor = () => {
    if (!auth.user) return '#3b82f6'; // Цэнхэр - traveler (default)
    
    switch (auth.user.role) {
      case 'guide':
        return '#f59e0b'; // Улбар шар - guide
      case 'provider':
        return '#10b981'; // Ногоон - provider
      case 'admin':
        return '#8b5cf6'; // Нил ягаан - admin
      default:
        return '#3b82f6'; // Цэнхэр - traveler
    }
  };

  // Camera smoothing функц
  const smoothFlyTo = useCallback((lat: number, lng: number, zoom: number = 15) => {
    if (!mapRef.current) return;
    
    const map = mapRef.current.getMap();
    map.flyTo({
      center: [lng, lat],
      zoom,
      duration: 2000,
      essential: true
    });
  }, []);

  const smoothEaseTo = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    
    const map = mapRef.current.getMap();
    map.easeTo({
      center: [lng, lat],
      duration: 1000,
      essential: true
    });
  }, []);

  // Follow mode toggle
  const toggleFollowMode = useCallback(() => {
    setIsFollowing(!isFollowing);
    if (!isFollowing && userLocation) {
      smoothEaseTo(userLocation.lat, userLocation.lng);
    }
  }, [isFollowing, userLocation, smoothEaseTo]);

  // 3. ТЕХНИКИЙН ТОХИРГОО

  // Location permissions шалгах
  useEffect(() => {
    if (!showRealTimeTracking) return;
    
    if ('permissions' in navigator && 'geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          setLocationPermission(permissionStatus.state as any);
          
          permissionStatus.onchange = () => {
            setLocationPermission(permissionStatus.state as any);
          };
        })
        .catch(() => {
          // Fallback for browsers that don't support permissions API
          setLocationPermission('prompt');
        });
    }
  }, [showRealTimeTracking]);

  // Handle location update with distance filter
  const handleLocationUpdate = useCallback((e: any) => {
    if (!e.coords) return;
    
    const newLocation = {
      lat: e.coords.latitude,
      lng: e.coords.longitude,
      heading: e.coords.heading
    };
    
    // Distance filter: зөвхөн 10 метрээс дээш хөдөлсөн үед шинэчлэх
    if (userLocation) {
      const distance = calculateDistance(
        userLocation.lat, userLocation.lng,
        newLocation.lat, newLocation.lng
      );
      
      if (distance < 10) return; // 10 метрээс бага хөдөлсөн бол шинэчлэхгүй
    }
    
    setUserLocation(newLocation);
    
    // Reverse geocoding (debounced)
    if (geocodeDebounceRef.current) {
      geocodeDebounceRef.current(newLocation.lat, newLocation.lng);
    }
    
    // Follow mode идэвхтэй бол камер дагах
    if (isFollowing && mapRef.current) {
      smoothEaseTo(newLocation.lat, newLocation.lng);
    }
    
    // GPS байршил олдсон мэдэгдэл
    if (showLocationSaveButton) {
      setShowLocationFound(true);
      setTimeout(() => {
        setShowLocationFound(false);
      }, 3000);
    }
  }, [userLocation, isFollowing, showLocationSaveButton, smoothEaseTo]);

  // Distance calculation (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Handle update location
  const handleUpdateLocation = async () => {
    if (!auth.user || !userLocation) return;
    
    setIsSavingLocation(true);
    try {
      const updatedUser = await apiUpdateProfile(auth.user._id, {
        location: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          address: userAddress || auth.user.location?.address || 'GPS Location'
        }
      });
      setAuth({ ...auth, user: updatedUser });
      setLocationSaved(true);
      setTimeout(() => {
        setShowLocationPanel(false);
      }, 2000);
    } catch (error) {
      console.error('Error updating location:', error);
      showSnackbar('Байрлал шинэчлэхэд алдаа гарлаа.', 'error');
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Filter users with valid location data and approved status
  const validUsers = useMemo(() => {
    return users.filter(u => 
      u.status === 'approved' && 
      u.location && 
      u.location.lat && 
      u.location.lng &&
      !isNaN(u.location.lat) &&
      !isNaN(u.location.lng)
    );
  }, [users]);

  // Prepare points for clustering
  const points = useMemo(() => {
    return validUsers.map(user => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        userId: user._id,
        user: user
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [user.location!.lng, user.location!.lat]
      }
    }));
  }, [validUsers]);

  // Initialize Supercluster
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 75,
      maxZoom: 20
    });
    cluster.load(points);
    return cluster;
  }, [points]);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    if (!mapLoaded || !mapRef.current) return [];
    const map = mapRef.current.getMap();
    const bounds = map.getBounds();
    const zoom = Math.floor(viewport.zoom);

    try {
      return supercluster.getClusters(
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom
      );
    } catch (error) {
      console.error('Error getting clusters:', error);
      return [];
    }
  }, [supercluster, viewport, mapLoaded]);

  // Initialize debounced geocoding
  useEffect(() => {
    geocodeDebounceRef.current = reverseGeocode;
    return () => {
      geocodeDebounceRef.current = null;
    };
  }, [reverseGeocode]);

  // Show loading state while fetching token
  if (!mapboxToken) {
    return (
      <div className="w-full h-full rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <div className="text-center">
          {tokenError ? (
            <>
              <span className="material-symbols-outlined text-4xl mb-2 text-red-400">error</span>
              <p className="text-red-500 text-sm font-medium">{tokenError}</p>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-orange-500 mx-auto mb-4"></div>
              <p className="text-slate-500 text-sm font-medium">Loading Map...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Show offline mode notification
  if (isOfflineMode) {
    return (
      <div className="w-full h-full rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <div className="text-center max-w-sm p-6">
          <span className="material-symbols-outlined text-4xl mb-4 text-blue-400">wifi_off</span>
          <h3 className="font-bold text-lg mb-2 dark:text-white">Offline Mode</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Та интернэт холболтгүй байна. Өмнө нь cache хийсэн газрын зургийг ашиглаж байна.
          </p>
          <div className="text-xs text-slate-500 mb-4">
            <p>• Cache хийсэн газрын зураг ашиглаж байна</p>
            <p>• Шинэчлэлт хийхгүй</p>
            <p>• Интернэт холболт идэвхтэй болох үед автоматаар шинэчлэгдэнэ</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white font-bold py-2 px-6 rounded-full"
          >
            Дахин оролдох
          </button>
        </div>
      </div>
    );
  }


  return (
    <div 
      className="w-full h-full rounded-3xl overflow-hidden relative"
    >
      <Map
        ref={mapRef}
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
        onLoad={() => setMapLoaded(true)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        reuseMaps={true}
        transformRequest={(url, resourceType) => {
          if (resourceType === 'Tile') {
            return { url, headers: { 'Cache-Control': 'max-age=86400' } };
          }
          return { url };
        }}
        interactive={true}
      >
        {/* Hidden GeolocateControl for programmatic access */}
        <GeolocateControl 
          ref={geolocateRef}
          position="top-right" 
          positionOptions={{ 
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 27000
          }} 
          trackUserLocation={showRealTimeTracking}
          showUserHeading={true}
          showAccuracyCircle={true}
          onGeolocate={handleLocationUpdate}
          style={{ display: 'none' }} // Completely hidden
        />

        {/* Custom user location marker with heading */}
        {userLocation && (
          <Marker
            latitude={userLocation.lat}
            longitude={userLocation.lng}
            anchor="center"
          >
            <div className="relative">
              {/* Puck/Heading indicator */}
              {userLocation.heading !== undefined && (
                <div 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: '40px',
                    height: '40px',
                    transform: `rotate(${userLocation.heading}deg)`,
                    transition: 'transform 0.3s ease'
                  }}
                >
                  <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-transparent border-b-blue-500"></div>
                </div>
              )}
              
              {/* User location dot */}
              <div 
                className="w-8 h-8 rounded-full border-4 border-white shadow-lg"
                style={{ backgroundColor: getUserLocationColor() }}
              ></div>
              
              {/* Accuracy circle */}
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
                style={{ 
                  width: '60px', 
                  height: '60px',
                  backgroundColor: getUserLocationColor()
                }}
              ></div>
            </div>
          </Marker>
        )}

        {clusters.map((cluster: any) => {
          const [lng, lat] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            // Render cluster
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                latitude={lat}
                longitude={lng}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  const expansionZoom = Math.min(
                    supercluster.getClusterExpansionZoom(cluster.id),
                    20
                  );
                  setViewport({
                    ...viewport,
                    latitude: lat,
                    longitude: lng,
                    zoom: expansionZoom
                  });
                }}
              >
                <div 
                  className="bg-white rounded-full shadow-lg border-4 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center font-bold text-white"
                  style={{
                    width: `${30 + (pointCount / points.length) * 50}px`,
                    height: `${30 + (pointCount / points.length) * 50}px`,
                    borderColor: markerColor,
                    backgroundColor: markerColor
                  }}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          // Render individual user marker
          const user = cluster.properties.user;
          return (
            <Marker
              key={`user-${user._id}`}
              latitude={lat}
              longitude={lng}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedUser(user);
              }}
            >
              <div 
                className="cursor-pointer hover:scale-110 transition-transform group relative"
              >
                <div 
                  className="bg-white p-1 rounded-full shadow-lg border-2"
                  style={{ borderColor: markerColor }}
                >
                  <img 
                    src={user.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                    className="w-10 h-10 rounded-full object-cover" 
                    alt={user.name}
                  />
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-bold pointer-events-none z-10">
                  {user.name}
                </div>
              </div>
            </Marker>
          );
        })}

        {selectedUser && (
          <Popup
            latitude={selectedUser.location!.lat}
            longitude={selectedUser.location!.lng}
            onClose={() => setSelectedUser(null)}
            closeButton={true}
            closeOnClick={false}
            offset={10}
          >
            <div className="p-3 min-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src={selectedUser.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                  className="w-12 h-12 rounded-full object-cover" 
                  alt={selectedUser.name}
                />
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{selectedUser.name}</h3>
                  {selectedUser.location?.address && (
                    <p className="text-xs text-slate-500">{selectedUser.location.address}</p>
                  )}
                </div>
              </div>
              
              {selectedUser.bio && (
                <p className="text-xs text-slate-600 mb-2 line-clamp-2">{selectedUser.bio}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm filled-icon text-yellow-500">star</span>
                  <span className="text-xs font-bold">
                    {selectedUser.averageRating || 'New'}
                  </span>
                </div>
                <button 
                  onClick={() => navigate(`/profile/${selectedUser._id}`)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                  style={{ 
                    backgroundColor: `${markerColor}15`, 
                    color: markerColor 
                  }}
                >
                  View Profile
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Custom control buttons */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* Cache refresh button */}
        <button
          onClick={() => {
            refreshMapCache();
            showSnackbar('Map cache refreshed! Next map load will fetch from server.', 'success');
          }}
          className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg"
          title="Refresh map cache"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>

        {/* Follow mode toggle */}
        <button
          onClick={toggleFollowMode}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${isFollowing ? 'bg-primary text-white' : 'bg-white text-slate-700'}`}
          title={isFollowing ? 'Follow mode on' : 'Follow mode off'}
        >
          <span className="material-symbols-outlined text-sm">
            {isFollowing ? 'location_searching' : 'location_disabled'}
          </span>
        </button>

        {/* GPS locate button */}
        <button
          onClick={() => {
            if (geolocateRef.current) {
              geolocateRef.current.trigger();
            }
          }}
          className="w-10 h-10 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-lg"
          title="Find my location"
        >
          <span className="material-symbols-outlined text-sm">my_location</span>
        </button>

        {/* Zoom in */}
        <button
          onClick={() => {
            if (mapRef.current) {
              const map = mapRef.current.getMap();
              map.zoomIn();
            }
          }}
          className="w-10 h-10 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-lg"
          title="Zoom in"
        >
          <span className="material-symbols-outlined text-sm">add</span>
        </button>

        {/* Zoom out */}
        <button
          onClick={() => {
            if (mapRef.current) {
              const map = mapRef.current.getMap();
              map.zoomOut();
            }
          }}
          className="w-10 h-10 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-lg"
          title="Zoom out"
        >
          <span className="material-symbols-outlined text-sm">remove</span>
        </button>
      </div>

      {/* Cache status indicator */}
      <div className="absolute top-4 left-4 bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-sm text-blue-500">storage</span>
          <span className="text-xs font-bold dark:text-white">Map Cache</span>
        </div>
        <div className="text-xs text-slate-500">
          {shouldLoadFromServer ? (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Loading from server</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Using cached data</span>
            </div>
          )}
          <div className="mt-1 text-[10px] text-slate-400">
            {isOfflineMode ? 'Offline mode' : 'Online'}
          </div>
        </div>
      </div>

      {/* User location info panel */}
      {userLocation && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getUserLocationColor() }}
            ></div>
            <span className="text-xs font-bold dark:text-white">
              {auth.user?.role === 'guide' ? 'Guide' : 
               auth.user?.role === 'provider' ? 'Provider' : 
               auth.user?.role === 'admin' ? 'Admin' : 'Traveler'}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            <div>Lat: {userLocation.lat.toFixed(6)}</div>
            <div>Lng: {userLocation.lng.toFixed(6)}</div>
            {userLocation.heading !== undefined && (
              <div>Heading: {Math.round(userLocation.heading)}°</div>
            )}
            {userAddress && (
              <div className="mt-1 text-xs truncate max-w-[200px]" title={userAddress}>
                {userAddress}
              </div>
            )}
          </div>
        </div>
      )}

      {validUsers.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 px-4 py-2 rounded-full shadow-md flex items-center gap-2 pointer-events-none">
          <span className="material-symbols-outlined text-sm text-slate-400">location_off</span>
          <p className="text-slate-500 text-xs whitespace-nowrap">No users with location data</p>
        </div>
      )}

      {/* GPS Location Save Panel */}
      {showLocationSaveButton && showLocationPanel && auth.user && (
        <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">my_location</span>
              <h3 className="font-bold text-sm dark:text-white">GPS Байрлал олдлоо</h3>
            </div>
            <button 
              onClick={() => setShowLocationPanel(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          
          {userLocation && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1">Таны одоогийн байрлал:</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold dark:text-white">
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </span>
                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">
                  GPS
                </span>
              </div>
            </div>
          )}

          {locationSaved ? (
            <div className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span className="text-xs font-bold">Байрлал амжилттай шинэчлэгдлээ!</span>
            </div>
          ) : (
            <button
              onClick={handleUpdateLocation}
              disabled={isSavingLocation}
              className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Шинэчлэж байна...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">update</span>
                  Байрлалаа шинэчлэх
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* GPS Location Found Notification */}
      {showLocationSaveButton && showLocationFound && (
        <div className="absolute top-4 left-4 right-4 bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xl border border-slate-200 dark:border-slate-800 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500">my_location</span>
              <div>
                <h3 className="font-bold text-sm dark:text-white">GPS Байрлал олдлоо</h3>
                <p className="text-xs text-slate-500">Таны байрлал амжилттай тодорхойлогдлоо</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setShowLocationFound(false);
                  if (auth.user) {
                    setShowLocationPanel(true);
                  } else {
                    setShowLoginPrompt(true);
                  }
                }}
                className="text-xs font-bold px-3 py-1.5 bg-primary text-white rounded-full"
              >
                Харах
              </button>
              <button 
                onClick={() => setShowLocationFound(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt for non-logged in users */}
      {showLocationSaveButton && showLoginPrompt && !auth.user && (
        <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">my_location</span>
              <h3 className="font-bold text-sm dark:text-white">GPS Байрлал олдлоо</h3>
            </div>
            <button 
              onClick={() => setShowLoginPrompt(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          
          {userLocation && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1">Таны одоогийн байрлал:</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold dark:text-white">
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </span>
                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">
                  GPS
                </span>
              </div>
            </div>
          )}

          <div className="mb-3">
            <p className="text-xs text-slate-500 mb-2">Байрлалаа профайлд хадгалахын тулд нэвтрэх шаардлагатай.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              Нэвтрэх
            </button>
            <button
              onClick={() => navigate('/register')}
              className="flex-1 bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Бүртгүүлэх
            </button>
          </div>
        </div>
      )}

      {showRealTimeTracking && locationPermission === 'denied' && (
        <div className="absolute bottom-4 left-4 right-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500 text-sm">location_off</span>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Real-time tracking-д байршлын эрх шаардлагатай. Тохиргооноос зөвшөөрнө үү.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Lazy-loaded wrapper component
const LazyEnhancedMapView: React.FC<EnhancedMapViewProps> = (props) => {
  return (
    <Suspense fallback={
      <div className="w-full h-full rounded-3xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm font-medium">Loading Map...</p>
        </div>
      </div>
    }>
      <EnhancedMapView {...props} />
    </Suspense>
  );
};

export default LazyEnhancedMapView;


