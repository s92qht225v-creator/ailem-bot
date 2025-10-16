import { X } from 'lucide-react';

const ImageModal = ({ imageUrl, onClose, title = 'Image' }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-screen">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100 transition-colors shadow-lg"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="bg-white rounded-lg p-2 shadow-2xl">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[85vh] object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {title && (
          <p className="text-white text-center mt-4 font-semibold">
            {title}
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
