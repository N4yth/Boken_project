import { Star, Heart } from "lucide-react";
import Image from 'next/image';
import React from 'react';

type WebtoonCardProps = {
  id: string;
  title: string;
  authors: string;
  rating: number;
  totalChapters: number;
  imageUrl?: string;
  onClick?: (id: string) => void;
  className?: string;
  // Props pour le système de favoris
  showFavorite?: boolean;
  isAddable?: boolean;
  releaseId?: string;
  onFavoriteClick?: (webtoonId: string, releaseId: string) => void;
  isFavoriteLoading?: boolean;
};

export default function WebtoonCard({
  id,
  title,
  authors,
  rating,
  totalChapters,
  imageUrl = "/images/NotFound.jpg",
  onClick,
  className = "",
  showFavorite = false,
  isAddable = true,
  releaseId,
  onFavoriteClick,
  isFavoriteLoading = false
}: WebtoonCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAddable) {
      return;
    }
    
    if (!releaseId) {
      alert("This webtoon doesn't have a release yet!");
      return;
    }
    
    if (onFavoriteClick) {
      setIsAnimating(true);
      onFavoriteClick(id, releaseId);
      
      // Reset animation after completion
      setTimeout(() => {
        setIsAnimating(false);
      }, 600);
    }
  };

  return (
    <article
      className={`bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-2xl shadow-md p-4 relative hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4 ${className}`}
      onClick={handleClick}
    >
      {/* Bouton favori */}
      {showFavorite && (
        <button
          className={`absolute top-4 right-4 z-9 transition-all duration-200 ${
            !isAddable 
              ? 'cursor-default opacity-100'
              : 'cursor-pointer hover:scale-110 active:scale-95' 
          } ${isAnimating ? 'animate-ping-once' : ''}`}
          onClick={handleFavoriteClick}
          disabled={isFavoriteLoading || !releaseId}
          aria-label={`${!isAddable ? 'Already in library' : 'Add to library'}: ${title}`}
        >
          {isFavoriteLoading ? (
            <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Heart
              className={`w-6 h-6 transition-all duration-300 ${
                !isAddable
                  ? 'fill-none stroke-white stroke-2 opacity-50'
                  : 'fill-pink-500 stroke-2 stroke-pink-500 hover:stroke-pink-600'
              }`}
            />
          )}
        </button>
      )}

      {/* Image + bandeau "Not found" */}
      <div className="flex-shrink-0 w-24 h-28 rounded-lg overflow-hidden bg-gray-200 flex flex-col items-center">
        <div className="w-24 h-24 overflow-hidden rounded-t-lg">
          <Image
            src={imageUrl}
            alt={title || "Webtoon cover"}
            width={96}
            height={96}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        {imageUrl === "/images/NotFound.jpg" && (
          <div className="w-full text-center bg-gray-800 text-gray-200 text-xs italic py-1 rounded-b-lg">
            image Not Found
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 text-white pr-8">
        <h3 className="text-lg font-semibold mb-1">
          {title}
        </h3>
        <p className="text-sm opacity-90 mb-2">
          {authors}
        </p>
        <div className="flex items-center mb-2">
          <span className="text-sm font-medium">
            {totalChapters} Chap
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 w-fit">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => {
              const fillPercent = rating >= i + 1 ? 100 : rating >= i + 0.5 ? 50 : 0;

              return (
                <div key={i} className="relative w-3.5 h-3.5">
                  <Star className="absolute top-0 left-0 w-3.5 h-3.5 text-white/40 fill-white/40" />
                  <div
                    className="absolute top-0 left-0 overflow-hidden"
                    style={{ width: `${fillPercent}%` }}
                  >
                    <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  </div>
                </div>
              );
            })}
          </div>
          <span className="text-xs sm:text-sm font-bold">
            {rating}/5
          </span>
        </div>
      </div>
    </article>
  );
}