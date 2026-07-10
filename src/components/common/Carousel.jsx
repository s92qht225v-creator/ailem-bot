import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Carousel = ({ banners = [], autoSlideInterval = 5000 }) => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const autoSlideRef = useRef(null);

  // Memoize activeBanners to prevent it from changing on every render
  // Only recalculate when banners array length or enabled states change
  const activeBanners = useMemo(() =>
    banners.filter(banner => banner.enabled),
    [banners]
  );

  const activeBannersCount = activeBanners.length;

  // Store count in ref for use in interval without triggering re-renders
  const countRef = useRef(activeBannersCount);
  useEffect(() => {
    countRef.current = activeBannersCount;
  }, [activeBannersCount]);

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? countRef.current - 1 : prevIndex - 1
    );
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === countRef.current - 1 ? 0 : prevIndex + 1
    );
  }, []);

  // Auto-slide functionality
  useEffect(() => {
    if (activeBannersCount <= 1 || isPaused) return;

    autoSlideRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === countRef.current - 1 ? 0 : prevIndex + 1
      );
    }, autoSlideInterval);

    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, [activeBannersCount, isPaused, autoSlideInterval]);

  // Touch handlers for swipe support
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  // Don't render if no active banners (AFTER all hooks)
  if (activeBannersCount === 0) {
    return null;
  }

  // Single banner - no controls needed
  if (activeBanners.length === 1) {
    const banner = activeBanners[0];
    return (
      <div className="relative h-64 md:h-80 lg:h-[640px] mx-4 lg:mx-0 mb-6 rounded-2xl lg:rounded-none overflow-hidden shadow-md">
        <img
          src={banner.imageUrl}
          alt={banner.title}
          className="w-full h-full object-cover"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      </div>
    );
  }

  // Multiple banners - full carousel
  return (
    <div 
      className="relative h-64 md:h-80 lg:h-[640px] mx-4 lg:mx-0 mb-6 rounded-2xl lg:rounded-none overflow-hidden shadow-md group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {activeBanners.map((banner, index) => (
          <div key={index} className="min-w-full h-full relative">
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="w-full h-full object-cover"
              fetchPriority={index === 0 ? 'high' : 'low'}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Previous/Next buttons - only visible on hover for desktop */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Oldingi slayd"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Keyingi slayd"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {activeBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
