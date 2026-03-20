import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiGetPosts, apiLikePost, apiCommentPost, apiDeletePost, apiToggleSavePost } from '../services/api';
import { Post, UserRole, Comment } from '../types';
import { AuthContext } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import BookingModal from '../components/BookingModal';
import ConfirmModal from '../components/ConfirmModal';
import { useSnackbar } from '../contexts/SnackbarContext';

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const { showSnackbar } = useSnackbar();
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showComments, setShowComments] = useState<{[key: string]: boolean}>({});
  const [commentTexts, setCommentTexts] = useState<{[key: string]: string}>({});
  const [localComments, setLocalComments] = useState<{[key: string]: Comment[]}>({});
  const [showBooking, setShowBooking] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { auth, setAuth } = useContext(AuthContext);
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const loadPosts = async () => {
    try {
      const data = await apiGetPosts();
      setPosts(data);
      setFilteredPosts(data);
      const commentsMap: {[key: string]: Comment[]} = {};
      data.forEach(post => {
        commentsMap[post._id] = post.comments || [];
      });
      setLocalComments(commentsMap);
      
      // URL-д post query parameter байвал тухайн пост руу scroll хийх
      const params = new URLSearchParams(location.search);
      const postId = params.get('post');
      if (postId) {
        setTimeout(() => {
          const element = document.getElementById(`post-${postId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 3000);
          }
        }, 500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [location.search]);

  // Шинэ пост шуурхай нэмэх (refresh хийхгүй)
  useEffect(() => {
    (window as any).__onNewPost = (newPost: Post) => {
      setPosts(prev => [newPost, ...prev]);
      setFilteredPosts(prev => [newPost, ...prev]);
      setLocalComments(prev => ({ ...prev, [newPost._id]: [] }));
    };
    return () => {
      delete (window as any).__onNewPost;
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = posts.filter(post => {
        const postDate = new Date(post.createdAt).toLocaleDateString();
        return (
            post.text.toLowerCase().includes(lowerQuery) ||
            post.userName.toLowerCase().includes(lowerQuery) ||
            (post.userPhone && post.userPhone.toLowerCase().includes(lowerQuery)) ||
            postDate.includes(lowerQuery) ||
            (post.type === 'service' && 'service'.includes(lowerQuery))
        );
    });
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  const handleLike = async (postId: string) => {
    if (!auth.user) return;
    
    const updateLikes = (list: Post[]) => list.map(p => {
      if (p._id === postId) {
        const isLiked = p.likes.includes(auth.user!._id);
        const newLikes = isLiked 
          ? p.likes.filter(id => id !== auth.user!._id)
          : [...p.likes, auth.user!._id];
        return { ...p, likes: newLikes };
      }
      return p;
    });

    setPosts(prev => updateLikes(prev));
    setFilteredPosts(prev => updateLikes(prev));
    await apiLikePost(postId, auth.user._id);
  };

  const handleSave = async (postId: string) => {
    if (!auth.user) return;
    try {
      const updatedUser = await apiToggleSavePost(auth.user._id, postId);
      setAuth(prev => ({ ...prev, user: updatedUser }));
    } catch (e) { console.error(e); }
  };

  const handleDelete = (postId: string) => {
    setConfirmDelete(postId);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    try {
      await apiDeletePost(confirmDelete);
      const remaining = posts.filter(p => p._id !== confirmDelete);
      setPosts(remaining);
      setFilteredPosts(remaining);
      showSnackbar("Post deleted.", 'success');
    } catch {
      showSnackbar("Failed to delete post.", 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    const commentText = commentTexts[postId];
    if (!commentText?.trim() || !auth.user) return;
    
    const userName = auth.user.name;
    const newComment: Comment = {
      id: Math.random().toString(),
      userId: auth.user._id,
      userName: userName, 
      text: commentText,
      createdAt: new Date().toISOString()
    };
    
    setLocalComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment]
    }));
    setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    await apiCommentPost(postId, auth.user._id, userName, commentText);
  };

  const handleShare = async (post: Post) => {
    const url = `${window.location.origin}/#/profile/${post.userId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.serviceTitle || 'VIP Travel Post',
          text: post.text,
          url: url,
        });
      } catch (err) { 
        await navigator.clipboard.writeText(url);
        showSnackbar("Link copied!", 'success');
      }
    } else {
      await navigator.clipboard.writeText(url);
      showSnackbar("Link copied!", 'success');
    }
    setShowShareMenu(null);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.Guide: return <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Guide</span>;
      case UserRole.Provider: return <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Provider</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            
            <div className="flex-1 relative">
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-primary/30 dark:text-white placeholder:text-slate-400" 
                placeholder={t('search_placeholder') || 'Search posts...'}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">post_add</span>
            <p className="text-slate-400 font-medium">{searchQuery ? t('no_results') : t('no_posts')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map(post => {
              const isLiked = post.likes.includes(auth.user?._id || '');
              const isSaved = auth.user?.savedPostIds?.includes(post._id);
              const isOwner = auth.user?._id === post.userId;

              return (
                <div id={`post-${post._id}`} key={post._id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${post.userId}`)}>
                      <img 
                        src={post.userPic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                        className="w-11 h-11 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800"
                        alt={post.userName}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm dark:text-white">{post.userName}</h4>
                          {getRoleBadge(post.userRole)}
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          {new Date(post.createdAt).toLocaleDateString()} · 
                          <span className="material-symbols-outlined text-[12px]">public</span>
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <button onClick={() => setShowMenu(showMenu === post._id ? null : post._id)} className="text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                      {showMenu === post._id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-slate-200 dark:border-slate-700 z-10 py-2 overflow-hidden">
                          {isOwner ? (
                            <>
                              <button onClick={() => { handleDelete(post._id); setShowMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-semibold flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">delete</span>
                                Delete Post
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { handleSave(post._id); setShowMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">{isSaved ? 'bookmark' : 'bookmark_border'}</span>
                                {isSaved ? 'Unsave' : 'Save Post'}
                              </button>
                              <button onClick={() => {showSnackbar('Reported', 'info'); setShowMenu(null)}} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">flag</span>
                                Report Post
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="px-4 pb-3">
                    {post.serviceTitle && <h3 className="font-bold text-lg mb-2 dark:text-white">{post.serviceTitle}</h3>}
                    <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{post.text}</p>
                  </div>

                  {/* Media */}
                  {post.image && <img src={post.image} className="w-full max-h-[500px] object-cover" alt="Post" />}
                  {post.video && <video src={post.video} controls className="w-full max-h-[500px] object-cover bg-black" />}

                  {/* Service Details */}
                  {post.type === 'service' && (
                    <div className="mx-4 mt-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-6">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Price</p>
                            <p className="text-xl font-black text-primary">${post.price}</p>
                          </div>
                          <div className="border-l border-slate-300 dark:border-slate-600 pl-6">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Capacity</p>
                            <p className="text-sm font-bold dark:text-white">{post.capacity || 0} people</p>
                          </div>
                        </div>
                        {!isOwner && (
                          <button 
                            onClick={() => setShowBooking(post._id)}
                            className="bg-primary text-white font-bold py-2 px-6 rounded-xl text-sm shadow-lg shadow-primary/30 hover:bg-blue-700 transition-all flex items-center gap-2"
                          >
                            {t('book_now')}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Like/Comment Count */}
                  <div className="px-4 py-3 flex items-center justify-between text-sm text-slate-500">
                    <button className="hover:underline">
                      {post.likes.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-red-500">❤️</span>
                          {post.likes.length}
                        </span>
                      )}
                    </button>
                    <div className="flex gap-3">
                      <button onClick={() => setShowComments(prev => ({...prev, [post._id]: !prev[post._id]}))} className="hover:underline">
                        {localComments[post._id]?.length || 0} {t('comments') || 'comments'}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons (Facebook-style) */}
                  <div className="border-t border-slate-200 dark:border-slate-800 px-2 py-1">
                    <div className="flex items-center justify-around">
                      <button 
                        onClick={() => handleLike(post._id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                          isLiked 
                            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">{isLiked ? 'favorite' : 'favorite_border'}</span>
                        Like
                      </button>
                      <button 
                        onClick={() => setShowComments(prev => ({...prev, [post._id]: !prev[post._id]}))}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[22px]">chat_bubble_outline</span>
                        Comment
                      </button>
                      <button 
                        onClick={() => handleShare(post)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[22px]">share</span>
                        Share
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {showComments[post._id] && (
                    <div className="border-t border-slate-200 dark:border-slate-800 px-4 pt-4 pb-3">
                      {/* Comment Input */}
                      <div className="flex gap-2 mb-4">
                        <img 
                          src={auth.user?.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
                          className="w-8 h-8 rounded-full object-cover"
                          alt="You"
                        />
                        <div className="flex-1 flex gap-2">
                          <input 
                            value={commentTexts[post._id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({...prev, [post._id]: e.target.value}))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCommentSubmit(post._id); }}
                            placeholder="Write a comment..."
                            className="flex-1 bg-slate-100 dark:bg-slate-800 text-sm rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-primary/30 dark:text-white border-none"
                          />
                          <button 
                            onClick={() => handleCommentSubmit(post._id)}
                            disabled={!commentTexts[post._id]?.trim()}
                            className="text-primary disabled:text-slate-400 transition-colors"
                          >
                            <span className="material-symbols-outlined">send</span>
                          </button>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {(localComments[post._id] || []).length === 0 ? (
                          <p className="text-center text-xs text-slate-400 py-4">No comments yet. Be the first!</p>
                        ) : (
                          (localComments[post._id] || []).map(comment => (
                            <div key={comment.id} className="flex gap-2">
                              <img 
                                src={'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
                                className="w-8 h-8 rounded-full object-cover"
                                alt={comment.userName}
                              />
                              <div className="flex-1">
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5">
                                  <p className="font-bold text-xs dark:text-white mb-0.5">{comment.userName}</p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">{comment.text}</p>
                                </div>
                                <div className="flex gap-3 px-4 mt-1">
                                  <button className="text-xs font-semibold text-slate-500 hover:text-primary">Like</button>
                                  <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBooking && auth.user && (
        <BookingModal 
          provider={{_id: filteredPosts.find(p => p._id === showBooking)?.userId || '', name: filteredPosts.find(p => p._id === showBooking)?.userName || '', pricePerDay: filteredPosts.find(p => p._id === showBooking)?.price || 0} as any}
          currentUser={auth.user}
          serviceTitle={filteredPosts.find(p => p._id === showBooking)?.serviceTitle}
          postId={showBooking}
          onClose={() => setShowBooking(null)}
          onSuccess={() => { setShowBooking(null); showSnackbar("Booking Sent!", 'success'); }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete Post"
        message="Are you sure you want to delete this post? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default Feed;
