import React, { useState, useContext } from 'react';
import { Post, UserRole, Comment } from '../types';
import { useNavigate } from 'react-router-dom';
import { apiCommentPost, apiToggleSavePost, apiDeletePost } from '../services/api';
import { AuthContext } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import BookingModal from './BookingModal';
import ConfirmModal from './ConfirmModal';
import { useSnackbar } from '../contexts/SnackbarContext';

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void; 
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onLike, onDelete }) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { t } = useLanguage();
  const { auth, setAuth } = useContext(AuthContext);
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments || []);
  const [showMenu, setShowMenu] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isLiked = post.likes.includes(currentUserId);
  const isSaved = auth.user?.savedPostIds?.includes(post._id);
  const isOwner = auth.user?._id === post.userId;
  const isAdmin = auth.user?.role === UserRole.Admin;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.Guide: return <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ml-2">Guide</span>;
      case UserRole.Provider: return <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ml-2">Provider</span>;
      default: return null;
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/#/profile/${post.userId}`; 
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.serviceTitle || 'CJ Travel Post',
          text: post.text,
          url: url,
        });
      } catch (err) { console.log('Share failed'); }
    } else {
      await navigator.clipboard.writeText(url);
      showSnackbar("Link copied to clipboard!", 'success');
    }
  };

  const handleSave = async () => {
    if (!auth.user) return;
    try {
      const updatedUser = await apiToggleSavePost(auth.user._id, post._id);
      setAuth(prev => ({ ...prev, user: updatedUser }));
    } catch (e) { console.error(e); }
  };

  const handleDelete = () => {
    setShowConfirmDelete(true);
    setShowMenu(false);
  };

  const handleDeleteConfirmed = async () => {
    try {
      await apiDeletePost(post._id);
      if (onDelete) onDelete(post._id);
      showSnackbar("Post deleted.", 'success');
    } catch {
      showSnackbar("Failed to delete post.", 'error');
    } finally {
      setShowConfirmDelete(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !auth.user) return;
    const userName = auth.user.name;
    const newComment: Comment = {
      id: Math.random().toString(),
      userId: currentUserId,
      userName: userName, 
      text: commentText,
      createdAt: new Date().toISOString()
    };
    setLocalComments([...localComments, newComment]);
    setCommentText('');
    await apiCommentPost(post._id, currentUserId, userName, commentText);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm mb-5 relative animate-fade-in">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${post.userId}`)}>
          <img 
            src={post.userPic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
            className="w-10 h-10 rounded-full object-cover border dark:border-slate-700" 
            alt={post.userName}
          />
          <div>
            <div className="flex items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{post.userName}</h4>
              {getRoleBadge(post.userRole)}
            </div>
            <p className="text-[10px] text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {post.type === 'service' && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Service</span>}
          {post.type === 'travel' && <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Travel Log</span>}
          
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-slate-400 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 shadow-lg rounded-xl border border-slate-100 dark:border-slate-700 z-10 py-1 overflow-hidden">
                {isOwner || isAdmin ? (
                  <button onClick={() => { handleDelete(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-bold">Delete Post</button>
                ) : (
                  <>
                    <button onClick={() => { handleSave(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">{isSaved ? 'Unsave' : 'Save'}</button>
                    <button onClick={() => {showSnackbar('Reported', 'info'); setShowMenu(false)}} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">Report</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media */}
      {post.image && <img src={post.image} className="w-full max-h-[400px] object-cover bg-slate-100 dark:bg-slate-800" alt="Post content" />}
      {post.video && <video src={post.video} controls className="w-full max-h-[400px] object-cover bg-black" />}

      {/* Content */}
      <div className="p-4">
        {post.serviceTitle && <h3 className="font-bold text-lg mb-1 dark:text-white">{post.serviceTitle}</h3>}
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-wrap leading-relaxed">{post.text}</p>
        
        {/* SERVICE DETAILS */}
        {post.type === 'service' && (
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Price</p>
                  <p className="text-lg font-black text-primary">${post.price}</p>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Booked</p>
                  <p className="text-sm font-bold dark:text-white mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                    {post.bookingCount || 0}
                  </p>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Capacity</p>
                  <p className="text-sm font-bold dark:text-white mt-1">{post.capacity || 0} ppl</p>
                </div>
              </div>
            </div>

            {!isOwner && (
              <button 
                onClick={() => setShowBooking(true)}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-primary/30 active:scale-95 transition-all hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {t('book_now')}
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-6">
            <button 
              onClick={() => onLike(post._id)}
              className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isLiked ? 'filled-icon' : ''}`}>favorite</span> 
              <span>{post.likes.length}</span>
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${showComments ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <span className="material-symbols-outlined text-[24px]">chat_bubble</span> 
              <span>{localComments.length}</span>
            </button>
            <button onClick={handleSave} className={`flex items-center text-sm font-bold ${isSaved ? 'text-primary' : 'text-slate-500'}`}>
              <span className={`material-symbols-outlined text-[24px] ${isSaved ? 'filled-icon' : ''}`}>bookmark</span>
            </button>
          </div>

          <button onClick={handleShare} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary">
            <span className="material-symbols-outlined text-[24px]">share</span>
          </button>
        </div>

        {/* Comment Section */}
        {showComments && (
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/50">
            <div className="space-y-3 mb-3 max-h-48 overflow-y-auto no-scrollbar">
              {localComments.length === 0 ? (
                <p className="text-center text-[10px] text-slate-400 py-2">No comments yet</p>
              ) : (
                localComments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl rounded-tl-none flex-1 shadow-sm">
                      <p className="text-[10px] font-black text-primary cursor-pointer hover:underline mb-0.5" onClick={() => navigate(`/profile/${comment.userId}`)}>{comment.userName}</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..." 
                className="flex-1 bg-slate-50 dark:bg-slate-800 text-xs rounded-xl px-4 py-2.5 outline-none dark:text-white border border-transparent focus:border-primary/30"
              />
              <button type="submit" disabled={!commentText.trim()} className="bg-primary/10 text-primary px-3 rounded-xl disabled:opacity-50 font-bold text-xs">Post</button>
            </form>
          </div>
        )}
      </div>

      {showBooking && auth.user && (
        <BookingModal 
          provider={{_id: post.userId, name: post.userName, pricePerDay: post.price || 0} as any} 
          currentUser={auth.user}
          serviceTitle={post.serviceTitle}
          postId={post._id}
          onClose={() => setShowBooking(false)}
          onSuccess={() => { setShowBooking(false); showSnackbar("Booking Sent!", 'success'); }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={showConfirmDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
};

export default PostCard;
