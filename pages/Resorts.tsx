import React, { useEffect, useState } from 'react';
import { apiGetPosts } from '../services/api'; // Using posts for listing services in this demo
import { Post } from '../types';

const Resorts: React.FC = () => {
  const [listings, setListings] = useState<Post[]>([]);

  useEffect(() => {
    // In a real app, this would be apiGetResorts()
    // Here we filter posts that are of type 'service' or created by Providers
    apiGetPosts().then(allPosts => {
      const services = allPosts.filter(p => p.type === 'service');
      setListings(services);
    });
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold dark:text-white">Resorts & Camps</h2>
        <button className="text-primary text-sm font-bold">Filter</button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
          {['All', 'Resorts', 'Camps', 'Hotels'].map(cat => (
              <button key={cat} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-700 whitespace-nowrap dark:text-white first:bg-primary first:text-white first:border-primary">
                  {cat}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
         {listings.length === 0 ? (
             <div className="text-center py-10 text-slate-500">
                 No listings available yet. Providers can post services in the feed!
             </div>
         ) : (
             listings.map(item => (
                 <div key={item._id} className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                     <div className="h-48 bg-gray-200 relative">
                         <img src={item.image || 'https://via.placeholder.com/400x200'} className="w-full h-full object-cover" alt="Resort" />
                         <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold">
                             4.8 ⭐
                         </div>
                     </div>
                     <div className="p-4">
                         <h3 className="font-bold text-lg dark:text-white mb-1">{item.text.substring(0, 30)}...</h3>
                         <p className="text-xs text-slate-500 mb-3">{item.userName}</p>
                         <div className="flex justify-between items-end">
                             <div>
                                 <span className="text-lg font-bold text-primary">$120</span>
                                 <span className="text-xs text-slate-400">/night</span>
                             </div>
                             <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Book Now</button>
                         </div>
                     </div>
                 </div>
             ))
         )}
      </div>
    </div>
  );
};

export default Resorts;