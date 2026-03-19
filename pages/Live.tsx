import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthContext } from '../App';
import { UserRole } from '../types';

const Live: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  
  const isProvider = auth.user?.role === UserRole.Provider || auth.user?.role === UserRole.Guide;

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-200/20 dark:bg-red-900/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                  <span className="material-symbols-outlined text-white text-2xl">sensors</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-red-600 to-pink-600 dark:from-red-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {t('live') || 'Live Streams'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Connect with travelers worldwide</p>
              </div>
            </div>
            {isProvider && (
              <button 
                onClick={() => navigate('/create-live')}
                className="group relative bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 transition-all duration-300 hover:scale-105 flex items-center gap-2 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-pink-600 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative material-symbols-outlined text-xl animate-pulse">videocam</span>
                <span className="relative">GO LIVE</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-3xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20 dark:border-slate-700/30">
                <span className="material-symbols-outlined text-7xl text-red-500 dark:text-red-400">live_tv</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="material-symbols-outlined text-white text-sm">bolt</span>
              </div>
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
            {t('no_live_streams') || 'No Live Streams Right Now'}
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            {t('no_live_streams_desc') || 'Be the first to start broadcasting! Share your travel adventures, connect with fellow explorers, and build your community in real-time.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {isProvider ? (
              <button 
                onClick={() => navigate('/create-live')}
                className="group bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-2xl group-hover:animate-pulse">play_circle</span>
                Start Your First Stream
              </button>
            ) : !auth.user ? (
              <button 
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
              >
                Login to Watch Streams
              </button>
            ) : (
              <div className="text-slate-500 dark:text-slate-400">
                <p className="text-sm">Become a Provider or Guide to start streaming</p>
              </div>
            )}
            
            <button 
              onClick={() => navigate('/feed')}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary transition-all duration-300 hover:scale-105"
            >
              Browse Posts Instead
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="material-symbols-outlined text-3xl text-red-500">radio_button_checked</span>
            </div>
            <h3 className="font-black text-xl mb-3 text-slate-900 dark:text-white">Real-Time Broadcasting</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Share your travel experiences as they happen. Stream your adventures, tours, and destinations live to engaged audiences worldwide.
            </p>
          </div>

          <div className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="material-symbols-outlined text-3xl text-blue-500">forum</span>
            </div>
            <h3 className="font-black text-xl mb-3 text-slate-900 dark:text-white">Interactive Engagement</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect with viewers through live chat, reactions, and Q&A. Build meaningful relationships with your travel community.
            </p>
          </div>

          <div className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="material-symbols-outlined text-3xl text-purple-500">trending_up</span>
            </div>
            <h3 className="font-black text-xl mb-3 text-slate-900 dark:text-white">Grow Your Audience</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Gain followers, showcase your expertise, and monetize your content. Turn your passion for travel into opportunity.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 dark:from-red-900/20 dark:via-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30 shadow-2xl mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-red-600 dark:text-red-400 mb-2">0</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Active Streams</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-2">0</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Live Viewers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-2">24/7</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Availability</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-green-600 dark:text-green-400 mb-2">HD</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Quality</div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 border-2 border-slate-100 dark:border-slate-800 shadow-2xl">
          <h3 className="text-3xl font-black text-center mb-12 text-slate-900 dark:text-white">How Live Streaming Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-white text-3xl font-black">
                1
              </div>
              <h4 className="font-bold text-lg mb-3 text-slate-900 dark:text-white">Start Your Stream</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Click "GO LIVE" and set up your broadcast with a title and description
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-white text-3xl font-black">
                2
              </div>
              <h4 className="font-bold text-lg mb-3 text-slate-900 dark:text-white">Engage Your Audience</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Interact with viewers through live chat, answer questions, and share moments
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-white text-3xl font-black">
                3
              </div>
              <h4 className="font-bold text-lg mb-3 text-slate-900 dark:text-white">Build Your Community</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Gain followers, get reactions, and grow your presence in the travel community
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Live;
