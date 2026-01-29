import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * A+ Content Module Renderer
 *
 * Supported module types:
 * - hero: Full-width banner with image and overlay text
 * - image_text: Image with text side by side
 * - features: Grid of feature icons with descriptions
 * - gallery: Image gallery grid
 * - text: Rich text block
 * - comparison: Comparison table
 * - accordion: Collapsible FAQ/info sections
 */

// Individual module components
const HeroModule = ({ data }) => {
  console.log('🖼️ HeroModule data:', data);
  console.log('🖼️ HeroModule image URL:', data.image);
  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
      <img
        src={data.image}
        alt={data.title || ''}
        className="w-full h-full object-cover"
        onError={(e) => console.error('❌ Image load error:', data.image, e)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
        <div className="p-4 text-white">
          {data.title && <h3 className="text-xl font-bold">{data.title}</h3>}
          {data.subtitle && <p className="text-sm opacity-90">{data.subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

const ImageTextModule = ({ data }) => (
  <div className={`flex flex-col ${data.imagePosition === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'} gap-4 mb-4`}>
    <div className="w-full md:w-1/2">
      <img
        src={data.image}
        alt={data.title || ''}
        className="w-full h-40 object-cover rounded-lg"
      />
    </div>
    <div className="w-full md:w-1/2 flex flex-col justify-center">
      {data.title && <h4 className="font-semibold text-gray-800 mb-2">{data.title}</h4>}
      {data.text && <p className="text-sm text-gray-600">{data.text}</p>}
    </div>
  </div>
);

const FeaturesModule = ({ data }) => (
  <div className="grid grid-cols-2 gap-3 mb-4">
    {data.items?.map((item, index) => (
      <div key={index} className="bg-gray-50 p-3 rounded-lg text-center">
        {item.icon && (
          <div className="text-2xl mb-1">{item.icon}</div>
        )}
        <h5 className="font-medium text-gray-800 text-sm">{item.title}</h5>
        {item.description && (
          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
        )}
      </div>
    ))}
  </div>
);

const GalleryModule = ({ data }) => (
  <div className="grid grid-cols-2 gap-2 mb-4">
    {data.images?.map((img, index) => (
      <img
        key={index}
        src={typeof img === 'string' ? img : img.url}
        alt={typeof img === 'string' ? '' : img.caption || ''}
        className="w-full h-32 object-cover rounded-lg"
      />
    ))}
  </div>
);

// Video embed module (YouTube/Vimeo)
const VideoModule = ({ data }) => {
  // Extract video embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;

    // YouTube patterns
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo patterns
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
  };

  const embedUrl = getEmbedUrl(data.url);

  if (!embedUrl) {
    return null;
  }

  return (
    <div className="mb-4">
      {data.title && <h4 className="font-semibold text-gray-800 mb-2">{data.title}</h4>}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title={data.title || 'Video'}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

// Seamless vertical image sequence - perfect for long infographic-style content
const ImageSequenceModule = ({ data }) => (
  <div className="mb-4 -mx-4">
    {data.images?.map((img, index) => (
      <img
        key={index}
        src={typeof img === 'string' ? img : img.url}
        alt=""
        className="w-full block"
        style={{ marginTop: index === 0 ? 0 : '-1px' }}
        onError={(e) => console.error('❌ Sequence image load error:', img, e)}
      />
    ))}
  </div>
);

const TextModule = ({ data }) => (
  <div className="mb-4">
    {data.title && <h4 className="font-semibold text-gray-800 mb-2">{data.title}</h4>}
    <div
      className="text-sm text-gray-600 prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  </div>
);

const ComparisonModule = ({ data }) => (
  <div className="mb-4 overflow-x-auto">
    {data.title && <h4 className="font-semibold text-gray-800 mb-2">{data.title}</h4>}
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-100">
          {data.headers?.map((header, index) => (
            <th key={index} className="p-2 text-left font-medium text-gray-700 border-b">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows?.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="p-2 border-b border-gray-100 text-gray-600">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AccordionItem = ({ title, content, isOpen, onToggle }) => (
  <div className="border-b border-gray-200">
    <button
      onClick={onToggle}
      className="w-full py-3 px-2 flex justify-between items-center text-left hover:bg-gray-50"
    >
      <span className="font-medium text-gray-800">{title}</span>
      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
    {isOpen && (
      <div className="px-2 pb-3 text-sm text-gray-600">
        {content}
      </div>
    )}
  </div>
);

const AccordionModule = ({ data }) => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      {data.title && (
        <h4 className="font-semibold text-gray-800 p-3 bg-gray-50 border-b">{data.title}</h4>
      )}
      {data.items?.map((item, index) => (
        <AccordionItem
          key={index}
          title={item.title}
          content={item.content}
          isOpen={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  );
};

// Module type to component mapping
const moduleComponents = {
  hero: HeroModule,
  image_text: ImageTextModule,
  features: FeaturesModule,
  gallery: GalleryModule,
  image_sequence: ImageSequenceModule,
  video: VideoModule,
  text: TextModule,
  comparison: ComparisonModule,
  accordion: AccordionModule,
};

// Main A+ Content renderer
const APlusContent = ({ content }) => {
  console.log('📦 APlusContent received:', content);
  console.log('📦 APlusContent type:', typeof content);

  // Handle null/undefined content
  if (!content) {
    console.log('📦 APlusContent: No content, returning null');
    return null;
  }

  // Parse if string
  let modules = content;
  if (typeof content === 'string') {
    try {
      modules = JSON.parse(content);
      console.log('📦 APlusContent parsed from string:', modules);
    } catch (e) {
      console.error('📦 APlusContent: Failed to parse JSON', e);
      return null;
    }
  }

  // Ensure modules is an array
  if (!modules?.modules || !Array.isArray(modules.modules)) {
    console.log('📦 APlusContent: No modules array found');
    return null;
  }

  // Don't render if no modules
  if (modules.modules.length === 0) {
    console.log('📦 APlusContent: Empty modules array');
    return null;
  }

  console.log('📦 APlusContent rendering modules:', modules.modules);

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      {modules.modules.map((module, index) => {
        const ModuleComponent = moduleComponents[module.type];
        if (!ModuleComponent) {
          console.warn(`Unknown A+ module type: ${module.type}`);
          return null;
        }
        return <ModuleComponent key={index} data={module} />;
      })}
    </div>
  );
};

export default APlusContent;

// Export module types for admin editor
export const MODULE_TYPES = [
  { type: 'hero', label: 'Banner', icon: '🖼️' },
  { type: 'image_text', label: 'Rasm + Matn', icon: '📝' },
  { type: 'features', label: 'Xususiyatlar', icon: '✨' },
  { type: 'gallery', label: 'Galereya', icon: '🖼️' },
  { type: 'image_sequence', label: 'Rasmlar ketma-ketligi', icon: '📜' },
  { type: 'video', label: 'Video (YouTube/Vimeo)', icon: '🎬' },
  { type: 'text', label: 'Matn bloki', icon: '📄' },
  { type: 'comparison', label: 'Taqqoslash jadvali', icon: '📊' },
  { type: 'accordion', label: 'Akkordeon (FAQ)', icon: '❓' },
];
