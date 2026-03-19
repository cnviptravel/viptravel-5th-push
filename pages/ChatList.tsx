
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetConversations, apiSubscribeToMessages } from '../services/api';
import { ChatPreview } from '../types';
import { AuthContext } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

const ChatList: React.FC = () => {
  const [conversations, setConversations] = useState<ChatPreview[]>([]);
  const { auth } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.user) {
      const loadConvos = () => {
          apiGetConversations(auth.user!._id).then(setConversations);
      };
      
      loadConvos();
      
      const unsubscribe = apiSubscribeToMessages(loadConvos);
      
      // Chat устгасны дараа refresh хийх event listener
      const handleChatDeleted = () => {
        loadConvos();
      };
      window.addEventListener('chat-deleted', handleChatDeleted);
      
      return () => {
        unsubscribe();
        window.removeEventListener('chat-deleted', handleChatDeleted);
      };
    }
  }, [auth.user]);

  const getTimeString = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold dark:text-white">{t('messages')}</h1>
      </div>

      <div className="flex flex-col gap-2">
        {conversations.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
                <span className="material-symbols-outlined text-5xl mb-3 opacity-30">chat</span>
                <p>{t('no_messages')}</p>
                <p className="text-sm">{t('start_conversation_hint')}</p>
            </div>
        ) : (
            conversations.map((chat) => (
                <div 
                    key={chat.userId} 
                    onClick={() => navigate(`/chat/${chat.userId}`)}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer border border-slate-100 dark:border-slate-800"
                >
                    <div className="relative">
                        <img 
                            src={chat.userPic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                            className="w-14 h-14 rounded-full object-cover" 
                            alt={chat.userName} 
                        />
                        {chat.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                                {chat.unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-base dark:text-white truncate">{chat.userName}</h3>
                            <span className="text-[10px] text-slate-400 shrink-0">{getTimeString(chat.lastMessageTime)}</span>
                        </div>
                        <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500'}`}>
                            {chat.lastMessage?.startsWith('CALL_LOG:') ? (() => {
                                const parts = chat.lastMessage.split(':');
                                const type = parts[1];
                                const duration = parts[2];
                                if (duration === 'MISSED') return t(`missed_${type.toLowerCase()}_call`);
                                return t(`${type.toLowerCase()}_call_log`);
                            })() : chat.lastMessage}
                        </p>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
