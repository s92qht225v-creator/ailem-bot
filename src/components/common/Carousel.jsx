import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Carousel = ({ banners = [], autoSlideInterval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const autoSlideRef = useRef(null);

  // Filter enabled banners - only recalculate when banners array length or enabled status changes
  const activeBanners = useMemo(() => {
    return banners.filter(banner => banner.enabled);
  }, [banners.length, banners.map(b => b.enabled).join(',')]);

  // Don't render if no active banners
  if (activeBanners.length === 0) {
    return null;
  }

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? activeBanners.length - 1 : prevIndex - 1
    );
  }, [activeBanners.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === activeBanners.length - 1 ? 0 : prevIndex + 1
    );
  }, [activeBanners.length]);

  // Auto-slide functionality
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    autoSlideRef.current = setInterval(() => {
      goToNext();
    }, autoSlideInterval);

    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, [activeBanners.length, isPaused, autoSlideInterval, goToNext]);

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

  // Single banner - no controls needed
  if (activeBanners.length === 1) {
    const banner = activeBanners[0];
    return (
      <div className="relative h-64 bg-gradient-to-r from-primary to-gray-700 mx-4 mb-6 rounded-lg overflow-hidden">
        <img
          src={banner.imageUrl}
          alt={banner.title}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
          <h2 className="text-3xl font-bold mb-2 text-center">{banner.title}</h2>
          <p className="text-lg mb-4">{banner.subtitle}</p>
        </div>
      </div>
    );
  }

  // Multiple banners - full carousel
  return (
    <div 
      className="relative h-64 bg-gradient-to-r from-primary to-gray-700 mx-4 mb-6 rounded-lg overflow-hidden group"
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
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
              <h2 className="text-3xl font-bold mb-2 text-center">{banner.title}</h2>
              <p className="text-lg mb-4">{banner.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Previous/Next buttons - only visible on hover for desktop */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {activeBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-white w-6' 
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
