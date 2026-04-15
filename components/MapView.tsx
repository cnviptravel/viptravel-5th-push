import React, { useState, useRef, useMemo, useEffect, Suspense, useContext } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl';
import Supercluster from 'supercluster';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiUpdateProfile } from '../services/api';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useSnackbar } from '../contexts/SnackbarContext';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

const API_URL = "https://api.cnviptravel.com";

interface MapViewProps {
  users: User[];
  markerColor?: string;
  showLocationSaveButton?: boolean;
}

const MapView: React.FC<MapViewProps> = ({ users, markerColor = '#f97316', showLocationSaveButton = false }) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { auth, setAuth } = useContext(AuthContext);
  const [viewport, setViewport] = useState({
    latitude: 47.9221,
    longitude: 106.9155,
    zoom: 5
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLocationFound, setShowLocationFound] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const geolocateRef = useRef<any>(null);

  // --- ЗАСВАР: GPS АЛДААГ ШАЛГАДАГ БОЛСОН ---
  const handleManualGeolocate = async () => {
    try {
      let lat, lng;

      if (Capacitor.isNativePlatform()) {
        const permissions = await Geolocation.checkPermissions();
        
        // Байршил тогтоох эрхийг шалгах
        if (permissions.location !== 'granted') {
          const request = await Geolocation.requestPermissions();
          if (request.location !== 'granted') {
            showSnackbar('Апп-д байршил ашиглах зөвшөөрөл өгнө үү.', 'warning');
            return;
          }
        }
        
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } else {
        if (geolocateRef.current) {
          geolocateRef.current.trigger();
          return;
        }
      }

      if (lat && lng) {
        processNewLocation(lat, lng);
      }
    } catch (error: any) {
      console.error("GPS Error:", error);
      
      // GPS унтраастай үед эсвэл бусад алдаа гарвал snackbar-аар мэдээлнэ
      if (error.message && (error.message.includes("location disabled") || error.code === "2")) {
        showSnackbar('Та утасныхаа GPS-ийг асаана уу.', 'warning');
      } else if (error.message && error.message.includes("timeout")) {
        showSnackbar('Байршил тогтоох хугацаа дууслаа. Та задгай талбайд дахин оролдоно уу.', 'warning');
      } else {
        showSnackbar('Байршил тогтооход алдаа гарлаа. GPS-ээ шалгана уу.', 'error');
      }
    }
  };

  const processNewLocation = (lat: number, lng: number) => {
    setViewport(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 14 }));
    
    if (showLocationSaveButton) {
      setUserLocation({ lat, lng });
      setShowLocationFound(true);
      setTimeout(() => setShowLocationFound(false), 3000);
    }
  };

  const handleUpdateLocation = async () => {
    if (!auth.user || !userLocation) return;
    
    setIsSavingLocation(true);
    try {
      const updatedUser = await apiUpdateProfile(auth.user._id, {
        location: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          address: auth.user.location?.address || 'GPS Location'
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

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`${API_URL}/mapbox-token`);
        const data = await response.json() as any;
        if (data.token) {
          setMapboxToken(data.token);
        } else {
          setTokenError(data.error || 'Failed to load map token');
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setTokenError('Failed to connect to server');
      }
    };
    fetchToken();
  }, []);

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

  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 75,
      maxZoom: 20
    });
    cluster.load(points);
    return cluster;
  }, [points]);

  const clusters = useMemo(() => {
    if (!mapRef.current || !mapLoaded) return [];
    const map = mapRef.current.getMap();
    const bounds = map.getBounds();
    const zoom = Math.floor(viewport.zoom);

    return supercluster.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom
    );
  }, [supercluster, viewport, mapLoaded]);

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

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden relative">
      <Map
        ref={mapRef}
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
        onLoad={() => setMapLoaded(true)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        reuseMaps
      >
        <NavigationControl position="top-right" />
        
        <GeolocateControl 
          ref={geolocateRef}
          position="top-right" 
          positionOptions={{ enableHighAccuracy: true }} 
          trackUserLocation={false} 
          showUserHeading={true}
          onGeolocate={(e: any) => {
            if (e.coords) {
              processNewLocation(e.coords.latitude, e.coords.longitude);
            }
          }}
        />

        <div className="absolute top-[110px] right-[10px] z-10">
            <button 
                onClick={handleManualGeolocate}
                className="bg-white dark:bg-slate-900 p-2 rounded shadow-md border border-slate-200 dark:border-slate-700 active:scale-90 transition-transform flex items-center justify-center"
            >
                <span className="material-symbols-outlined text-primary text-[20px]">my_location</span>
            </button>
        </div>

        {clusters.map((cluster: any) => {
          const [lng, lat] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
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
              <div className="cursor-pointer hover:scale-110 transition-transform group relative">
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
    </div>
  );
};

const LazyMapView: React.FC<MapViewProps> = (props) => {
  return (
    <Suspense fallback={
      <div className="w-full h-full rounded-3xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm font-medium">Loading Map...</p>
        </div>
      </div>
    }>
      <MapView {...props} />
    </Suspense>
  );
};

export default LazyMapView;