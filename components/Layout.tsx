import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    apiGetNotifications, 
    apiMarkNotificationsRead, 
    apiGetTotalUnreadMessageCount
} from '../services/api';
import { AuthContext } from '../App';
import { Notification, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import CreatePostModal from './CreatePostModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { showSnackbar, dismissSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const { t } = useLanguage();
  const { config } = useAppConfig();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNoteCount, setUnreadNoteCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Landing хуудас: "/" замд нэвтрээгүй хэрэглэгч байгаа үед header/footer нуух
  const isLandingPage = location.pathname === '/' && !auth.isAuthenticated;

  const showNav = !isLandingPage
                  && !['/login', '/role-select', '/translator'].includes(location.pathname) 
                  && !location.pathname.startsWith('/register')
                  && !location.pathname.startsWith('/chat/'); 

  const isFixedPage = location.pathname.startsWith('/chat/') || location.pathname === '/translator';
  const isAdmin = auth.user?.role === UserRole.Admin || !!auth.user?.isAdmin;

  useEffect(() => { setShowNotifications(false); }, [location.pathname]);

  // Мэдэгдэл болон Дуудлага шалгах логик (Real-time Pusher Event)
  useEffect(() => {
    if (auth.user && !isAdmin) {
        const fetchNotes = async () => {
            try {
                const data = await apiGetNotifications(auth.user!._id);
                const filtered = data.filter((n: any) => !n.type?.includes('call'));
                setNotifications(filtered);
                setUnreadNoteCount(filtered.filter(n => !n.read).length);
            } catch (err) {
                console.error("Fetch notes error:", err);
            }
        };

        fetchNotes();

        const handleNewNotification = (e: any) => {
            const notif = e.detail;
            setNotifications(prev => [notif, ...prev]);
            setUnreadNoteCount(prev => prev + 1);
        };

        document.addEventListener('new-notification', handleNewNotification);
        return () => document.removeEventListener('new-notification', handleNewNotification);
    }
  }, [auth.user, isAdmin]);

  useEffect(() => {
      if (auth.user) {
          const updateMsgCount = async () => {
              const count = await apiGetTotalUnreadMessageCount(auth.user!._id);
              setUnreadMsgCount(count);
          };
          updateMsgCount();
          
          const handleNewMessage = () => updateMsgCount();
          document.addEventListener('new-chat-message', handleNewMessage);
          return () => document.removeEventListener('new-chat-message', handleNewMessage);
      }
  }, [auth.user?._id]);

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadNoteCount > 0 && auth.user && !isAdmin) {
        await apiMarkNotificationsRead(auth.user._id);
        setUnreadNoteCount(0);
    }
  };


  const handleCreateClick = () => {
      if (auth.user?.status === 'pending' || auth.user?.status === 'rejected') {
          showSnackbar(auth.user?.status === 'pending' ? 'Таны бүртгэл хянагдаж байна.' : 'Таны бүртгэл татгалзсан.', 'info');
          return;
      }
      setShowCreatePost(true);
  };

  const getNavClass = (path: string) => {
    const isActive = location.pathname === path;
    return `flex flex-col items-center gap-1 transition-colors outline-none ${isActive ? 'text-primary' : 'text-[#4c739a] dark:text-slate-400 hover:text-primary/70'}`;
  };

  const getIconStyle = (path: string) => {
    return location.pathname === path ? { fontVariationSettings: "'FILL' 1" } : {};
  };

  return (
    <div className="bg-background-light dark:bg-background-dark h-screen text-[#0d141b] dark:text-white flex flex-col font-display max-w-md mx-auto shadow-2xl overflow-hidden relative">
       {showNav && (
        <header className="shrink-0 bg-white/90 dark:bg-[#101922]/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 z-50">
          <div className="flex items-center p-4 justify-between relative">
            
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
               {config.logoUrl ? (
                   <img src={config.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
               ) : (
                   <span className="material-symbols-outlined text-primary text-3xl">explore</span>
               )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/translator')} className="relative flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-primary outline-none">
                 <span className="material-symbols-outlined text-xl">translate</span>
              </button>
              <button onClick={() => navigate('/chats')} className="relative flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors outline-none">
                 <span className="material-symbols-outlined text-xl">chat_bubble</span>
                 {unreadMsgCount > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 px-1">{unreadMsgCount > 99 ? '99+' : unreadMsgCount}</span>}
              </button>
              {!isAdmin && (
                  <button onClick={handleNotificationClick} className="relative flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors outline-none">
                    <span className="material-symbols-outlined text-xl">notifications</span>
                    {unreadNoteCount > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 px-1">{unreadNoteCount > 99 ? '99+' : unreadNoteCount}</span>}
                  </button>
              )}
            </div>

            {showNotifications && (
                <div className="absolute top-16 right-4 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 max-h-96 overflow-y-auto no-scrollbar animate-fade-in">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm flex items-center justify-between">
                        <span>{t('notifications')}</span>
                        {notifications.length > 0 && (
                            <span className="text-[10px] text-slate-400">{notifications.length} мэдэгдэл</span>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                            <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">notifications_off</span>
                            <p className="text-xs text-slate-500">{t('no_notifications')}</p>
                        </div>
                    ) : (
                        notifications.map(n => {
                            // Мэдэгдэл дээр дарахад хаашаа үсрэхийг тодорхойлох
                            const handleNotificationItemClick = () => {
                                setShowNotifications(false);
                                
                                // Like болон Comment мэдэгдэл -> Пост руу үсрэх
                                if ((n.type === 'like' || n.type === 'comment') && n.postId) {
                                    navigate(`/?post=${n.postId}`);
                                }
                                // Follow мэдэгдэл -> Дагасан хүний профайл руу үсрэх
                                else if (n.type === 'follow' && n.senderId) {
                                    navigate(`/profile/${n.senderId}`);
                                }
                                // Review мэдэгдэл -> Өөрийн профайл дээрх review хэсэг рүү
                                else if (n.type === 'review') {
                                    navigate('/profile');
                                }
                                // Approved/Rejected -> Өөрийн профайл руу
                                else if (n.type === 'approved' || n.type === 'rejected') {
                                    navigate('/profile');
                                }
                                // Booking -> Пост руу (хэрэв postId байвал)
                                else if (n.type === 'booking' && n.postId) {
                                    navigate(`/?post=${n.postId}`);
                                }
                                // Бусад тохиолдолд senderId-тай бол тэр хүний профайл руу
                                else if (n.senderId && n.senderId !== 'admin') {
                                    navigate(`/profile/${n.senderId}`);
                                }
                            };

                            // Мэдэгдлийн icon тодорхойлох
                            const getNotificationIcon = () => {
                                switch(n.type) {
                                    case 'like': return { icon: 'favorite', color: 'text-red-500', bg: 'bg-red-100' };
                                    case 'comment': return { icon: 'chat_bubble', color: 'text-blue-500', bg: 'bg-blue-100' };
                                    case 'follow': return { icon: 'person_add', color: 'text-green-500', bg: 'bg-green-100' };
                                    case 'review': return { icon: 'star', color: 'text-yellow-500', bg: 'bg-yellow-100' };
                                    case 'approved': return { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-100' };
                                    case 'rejected': return { icon: 'cancel', color: 'text-red-500', bg: 'bg-red-100' };
                                    case 'booking': return { icon: 'calendar_month', color: 'text-purple-500', bg: 'bg-purple-100' };
                                    default: return { icon: 'notifications', color: 'text-blue-500', bg: 'bg-blue-100' };
                                }
                            };
                            
                            const iconStyle = getNotificationIcon();

                            return (
                                <div 
                                    key={n.id} 
                                    onClick={handleNotificationItemClick}
                                    className={`p-3 border-b border-slate-50 dark:border-slate-800/50 flex gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                >
                                    {/* Мэдэгдлийн icon */}
                                    <div className={`w-10 h-10 rounded-full ${iconStyle.bg} dark:bg-opacity-20 flex items-center justify-center shrink-0`}>
                                        <span className={`material-symbols-outlined text-lg ${iconStyle.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {iconStyle.icon}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                                            <span 
                                                className="font-bold cursor-pointer hover:text-primary hover:underline" 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setShowNotifications(false); 
                                                    if (n.senderId && n.senderId !== 'admin') navigate(`/profile/${n.senderId}`); 
                                                }}
                                            >
                                                {n.senderName}
                                            </span>
                                            {' '}
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {n.type === 'like' ? t('notif_like') : 
                                                 n.type === 'review' ? t('notif_review') : 
                                                 n.type === 'approved' ? t('notif_approved') : 
                                                 n.type === 'rejected' ? t('notif_rejected') : 
                                                 n.type === 'follow' ? t('notif_follow') : 
                                                 n.type === 'booking' ? 'захиалга хийсэн' :
                                                 n.type.includes('call') ? t('notif_call') : t('notif_comment')}
                                            </span>
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</p>
                                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                                        </div>
                                    </div>
                                    
                                    {/* Үсрэх icon */}
                                    <div className="flex items-center">
                                        <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
          </div>
        </header>
      )}

      <main className={`flex-1 min-h-0 no-scrollbar relative ${isFixedPage ? 'overflow-hidden' : 'overflow-y-auto'} ${showNav ? 'pb-24' : ''}`}>
        {children}
      </main>

      <CreatePostModal isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} />

      {showNav && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#101922]/95 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 max-w-md mx-auto">
          <div className="flex justify-around items-end h-20 px-2 pb-3">
            <button className={getNavClass('/')} onClick={() => navigate('/')}>
              <span className="material-symbols-outlined text-2xl leading-none" style={getIconStyle('/')}>home</span>
              <span className="text-[9px] font-bold whitespace-nowrap mt-0.5">Feed</span>
            </button>
            <button className={getNavClass('/services')} onClick={() => navigate('/services')}>
              <span className="material-symbols-outlined text-2xl leading-none" style={getIconStyle('/services')}>build</span>
              <span className="text-[9px] font-bold whitespace-nowrap mt-0.5">Services</span>
            </button>

            <div className="flex flex-col items-center justify-end relative z-10 mb-1">
               <button onClick={isAdmin ? () => navigate('/admin') : handleCreateClick} className={`size-14 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-90 border-4 border-white dark:border-slate-900 outline-none focus:outline-none -mt-8 ${isAdmin ? 'bg-red-500 shadow-red-500/40' : `bg-primary shadow-blue-500/40 ${auth.user?.status === 'pending' ? 'opacity-70 grayscale cursor-not-allowed' : 'hover:scale-105'}`}`}>
                 <span className="material-symbols-outlined text-white text-3xl leading-none">{isAdmin ? 'admin_panel_settings' : 'add'}</span>
               </button>
            </div>

            <button className={getNavClass('/live')} onClick={() => navigate('/live')}>
              <span className="material-symbols-outlined text-2xl leading-none" style={getIconStyle('/live')}>videocam</span>
              <span className="text-[9px] font-bold whitespace-nowrap mt-0.5">Live</span>
            </button>
            <button className={getNavClass('/profile')} onClick={() => navigate('/profile')}>
              <span className="material-symbols-outlined text-2xl leading-none" style={getIconStyle('/profile')}>account_circle</span>
              <span className="text-[9px] font-bold whitespace-nowrap mt-0.5">Profile</span>
            </button>
          </div>
        </footer>
      )}

    </div>
  );
};

export default Layout;