// src/components/ImageViewer.tsx
import React from 'react';

interface ImageViewerProps {
  src: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ src, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10"
      >
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>
      
      <img 
        src={src} 
        alt="Preview" 
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Зурган дээр дарахад хаагдахгүй байх
      />
    </div>
  );
};

export default ImageViewer;