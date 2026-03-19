
import React, { useState } from 'react';
import { User, Review } from '../types';
import { apiAddReview } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface ReviewSectionProps {
  providerId: string;
  reviews: Review[];
  currentUser: User | null;
  onReviewAdded: () => void;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ providerId, reviews, currentUser, onReviewAdded }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || rating === 0) return;

    setIsSubmitting(true);
    await apiAddReview(providerId, {
        reviewerId: currentUser._id,
        reviewerName: currentUser.name,
        reviewerPic: currentUser.profilePic,
        rating: rating,
        comment: comment
    });
    setRating(0);
    setComment('');
    setIsSubmitting(false);
    onReviewAdded();
  };

  return (
    <div className="mt-6">
       <h3 className="font-bold text-lg dark:text-white mb-4">{t('reviews')} ({reviews.length})</h3>

       {/* Review Form */}
       {currentUser && currentUser._id !== providerId && (
           <form onSubmit={handleSubmit} className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
               <div className="flex gap-2 mb-3">
                   {[1, 2, 3, 4, 5].map(star => (
                       <button 
                         key={star} 
                         type="button"
                         onClick={() => setRating(star)}
                         className={`text-2xl ${star <= rating ? 'text-yellow-500 material-symbols-outlined filled-icon' : 'text-slate-300 material-symbols-outlined'}`}
                       >
                           star
                       </button>
                   ))}
               </div>
               <textarea 
                   value={comment}
                   onChange={(e) => setComment(e.target.value)}
                   placeholder={t('share_experience')}
                   className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm outline-none dark:text-white mb-2"
               />
               <button 
                  type="submit" 
                  disabled={rating === 0 || isSubmitting}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50"
               >
                   {t('submit_review')}
               </button>
           </form>
       )}

       {/* Review List */}
       <div className="space-y-4">
           {reviews.length === 0 ? (
               <p className="text-slate-500 text-sm text-center italic">{t('no_results')}</p>
           ) : (
               reviews.map(review => (
                   <div key={review.id} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0">
                       <div className="flex items-center gap-2 mb-2">
                           <img src={review.reviewerPic} alt={review.reviewerName} className="w-8 h-8 rounded-full object-cover" />
                           <div>
                               <p className="text-sm font-bold dark:text-white">{review.reviewerName}</p>
                               <div className="flex text-yellow-500 text-[10px]">
                                   {Array.from({length: 5}).map((_, i) => (
                                       <span key={i} className={`material-symbols-outlined text-[12px] ${i < review.rating ? 'filled-icon' : ''}`}>star</span>
                                   ))}
                               </div>
                           </div>
                           <span className="ml-auto text-[10px] text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                       </div>
                       <p className="text-sm text-slate-600 dark:text-slate-300">{review.comment}</p>
                   </div>
               ))
           )}
       </div>
    </div>
  );
};

export default ReviewSection;
