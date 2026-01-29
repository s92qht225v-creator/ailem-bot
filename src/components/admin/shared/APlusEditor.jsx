import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Image, X } from 'lucide-react';
import { storageAPI } from '../../../services/api';

const MODULE_TYPES = [
  { type: 'hero', label: 'Banner', icon: '🖼️' },
  { type: 'image_text', label: 'Rasm + Matn', icon: '📝' },
  { type: 'features', label: 'Xususiyatlar', icon: '✨' },
  { type: 'gallery', label: 'Galereya', icon: '🖼️' },
  { type: 'image_sequence', label: 'Rasmlar ketma-ketligi', icon: '📜' },
  { type: 'text', label: 'Matn bloki', icon: '📄' },
  { type: 'comparison', label: 'Taqqoslash jadvali', icon: '📊' },
  { type: 'accordion', label: 'Akkordeon (FAQ)', icon: '❓' },
];

// Default data for each module type
const getDefaultModuleData = (type) => {
  switch (type) {
    case 'hero':
      return { type, image: '', title: '', subtitle: '' };
    case 'image_text':
      return { type, image: '', title: '', text: '', imagePosition: 'left' };
    case 'features':
      return { type, items: [{ icon: '✨', title: '', description: '' }] };
    case 'gallery':
      return { type, images: [] };
    case 'image_sequence':
      return { type, images: [] };
    case 'text':
      return { type, title: '', content: '' };
    case 'comparison':
      return { type, title: '', headers: ['', ''], rows: [['', '']] };
    case 'accordion':
      return { type, title: '', items: [{ title: '', content: '' }] };
    default:
      return { type };
  }
};

// Image upload component
const ImageUploader = ({ value, onChange, label = 'Rasm' }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await storageAPI.uploadImage(file, 'a-plus');
      console.log('📤 A+ Image upload result:', result);
      console.log('📤 A+ Image URL:', result.url);
      onChange(result.url); // uploadImage returns { path, url, bucket }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Rasm yuklashda xatolik: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {value ? (
        <div className="relative">
          <img src={value} alt="" className="w-full h-32 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-accent">
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          {uploading ? (
            <span className="text-sm text-gray-500">Yuklanmoqda...</span>
          ) : (
            <div className="flex flex-col items-center text-gray-500">
              <Image className="w-6 h-6 mb-1" />
              <span className="text-xs">Rasm yuklash</span>
            </div>
          )}
        </label>
      )}
    </div>
  );
};

// Module editors for each type
const HeroEditor = ({ data, onChange }) => (
  <div className="space-y-3">
    <ImageUploader value={data.image} onChange={(url) => onChange({ ...data, image: url })} />
    <div>
      <label className="text-sm font-medium text-gray-700">Sarlavha</label>
      <input
        type="text"
        value={data.title || ''}
        onChange={(e) => onChange({ ...data, title: e.target.value })}
        className="w-full mt-1 p-2 border rounded-lg"
        placeholder="Asosiy sarlavha"
      />
    </div>
    <div>
      <label className="text-sm font-medium text-gray-700">Qo'shimcha matn</label>
      <input
        type="text"
        value={data.subtitle || ''}
        onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
        className="w-full mt-1 p-2 border rounded-lg"
        placeholder="Qisqa tavsif"
      />
    </div>
  </div>
);

const ImageTextEditor = ({ data, onChange }) => (
  <div className="space-y-3">
    <ImageUploader value={data.image} onChange={(url) => onChange({ ...data, image: url })} />
    <div>
      <label className="text-sm font-medium text-gray-700">Rasm joylashuvi</label>
      <select
        value={data.imagePosition || 'left'}
        onChange={(e) => onChange({ ...data, imagePosition: e.target.value })}
        className="w-full mt-1 p-2 border rounded-lg"
      >
        <option value="left">Chapda</option>
        <option value="right">O'ngda</option>
      </select>
    </div>
    <div>
      <label className="text-sm font-medium text-gray-700">Sarlavha</label>
      <input
        type="text"
        value={data.title || ''}
        onChange={(e) => onChange({ ...data, title: e.target.value })}
        className="w-full mt-1 p-2 border rounded-lg"
      />
    </div>
    <div>
      <label className="text-sm font-medium text-gray-700">Matn</label>
      <textarea
        value={data.text || ''}
        onChange={(e) => onChange({ ...data, text: e.target.value })}
        className="w-full mt-1 p-2 border rounded-lg"
        rows={3}
      />
    </div>
  </div>
);

const FeaturesEditor = ({ data, onChange }) => {
  const items = data.items || [];

  const addItem = () => {
    onChange({ ...data, items: [...items, { icon: '✨', title: '', description: '' }] });
  };

  const updateItem = (index, updates) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({ ...data, items: newItems });
  };

  const removeItem = (index) => {
    onChange({ ...data, items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={item.icon || ''}
              onChange={(e) => updateItem(index, { icon: e.target.value })}
              className="w-16 p-2 border rounded-lg text-center"
              placeholder="Icon"
            />
            <input
              type="text"
              value={item.title || ''}
              onChange={(e) => updateItem(index, { title: e.target.value })}
              className="flex-1 p-2 border rounded-lg"
              placeholder="Xususiyat nomi"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={item.description || ''}
            onChange={(e) => updateItem(index, { description: e.target.value })}
            className="w-full p-2 border rounded-lg"
            placeholder="Tavsif (ixtiyoriy)"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accent hover:text-accent"
      >
        + Xususiyat qo'shish
      </button>
    </div>
  );
};

const GalleryEditor = ({ data, onChange }) => {
  const images = data.images || [];
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await storageAPI.uploadImage(file, 'a-plus');
      console.log('📤 A+ Gallery upload result:', result);
      console.log('📤 A+ Gallery URL:', result.url);
      onChange({ ...data, images: [...images, result.url] }); // uploadImage returns { path, url, bucket }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Rasm yuklashda xatolik: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    onChange({ ...data, images: images.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, index) => (
          <div key={index} className="relative">
            <img src={img} alt="" className="w-full h-20 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <label className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-accent">
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          {uploading ? (
            <span className="text-xs text-gray-500">...</span>
          ) : (
            <Plus className="w-6 h-6 text-gray-400" />
          )}
        </label>
      </div>
    </div>
  );
};

// Seamless vertical image sequence editor
const ImageSequenceEditor = ({ data, onChange }) => {
  const images = data.images || [];
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Upload all selected files
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await storageAPI.uploadImage(file, 'a-plus');
        console.log('📤 A+ Sequence upload result:', result);
        return result.url;
      });
      const newUrls = await Promise.all(uploadPromises);
      onChange({ ...data, images: [...images, ...newUrls] });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Rasm yuklashda xatolik: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    onChange({ ...data, images: images.filter((_, i) => i !== index) });
  };

  const moveImage = (index, direction) => {
    const newImages = [...images];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    onChange({ ...data, images: newImages });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Rasmlar vertikal ravishda bir-biriga ulanib ko'rinadi. Ko'p rasm tanlash mumkin.
      </p>
      <div className="space-y-2">
        {images.map((img, index) => (
          <div key={index} className="relative group">
            <img src={img} alt="" className="w-full object-cover rounded-lg" />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => moveImage(index, -1)}
                disabled={index === 0}
                className="p-1 bg-white/90 text-gray-700 rounded shadow hover:bg-white disabled:opacity-30"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveImage(index, 1)}
                disabled={index === images.length - 1}
                className="p-1 bg-white/90 text-gray-700 rounded shadow hover:bg-white disabled:opacity-30"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="p-1 bg-red-500 text-white rounded shadow hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {index + 1}/{images.length}
            </span>
          </div>
        ))}
      </div>
      <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-accent">
        <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        {uploading ? (
          <span className="text-sm text-gray-500">Yuklanmoqda...</span>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <Plus className="w-5 h-5" />
            <span className="text-sm">Rasmlar qo'shish</span>
          </div>
        )}
      </label>
    </div>
  );
};

const TextEditor = ({ data, onChange }) => (
  <div className="space-y-3">
    <div>
      <label className="text-sm font-medium text-gray-700">Sarlavha (ixtiyoriy)</label>
      <input
        type="text"
        value={data.title || ''}
        onChange={(e) => onChange({ ...data, title: e.target.value })}
        className="w-full mt-1 p-2 border rounded-lg"
      />
    </div>
    <div>
      <label className="text-sm font-medium text-gray-700">Matn (HTML qo'llab-quvvatlanadi)</label>
      <textarea
        value={data.content || ''}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        className="w-full mt-1 p-2 border rounded-lg font-mono text-sm"
        rows={5}
        placeholder="<p>Matn yozing...</p>"
      />
    </div>
  </div>
);

const ComparisonEditor = ({ data, onChange }) => {
  const headers = data.headers || ['', ''];
  const rows = data.rows || [['', '']];

  const updateHeader = (index, value) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    onChange({ ...data, headers: newHeaders });
  };

  const updateCell = (rowIndex, colIndex, value) => {
    const newRows = rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row
    );
    onChange({ ...data, rows: newRows });
  };

  const addRow = () => {
    onChange({ ...data, rows: [...rows, headers.map(() => '')] });
  };

  const removeRow = (index) => {
    onChange({ ...data, rows: rows.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700">Jadval sarlavhasi</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="w-full mt-1 p-2 border rounded-lg"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="p-1">
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => updateHeader(index, e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm font-medium"
                    placeholder={`Ustun ${index + 1}`}
                  />
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-1">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </td>
                ))}
                <td className="p-1">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accent"
      >
        + Qator qo'shish
      </button>
    </div>
  );
};

const AccordionEditor = ({ data, onChange }) => {
  const items = data.items || [];

  const addItem = () => {
    onChange({ ...data, items: [...items, { title: '', content: '' }] });
  };

  const updateItem = (index, updates) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({ ...data, items: newItems });
  };

  const removeItem = (index) => {
    onChange({ ...data, items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700">Sarlavha (ixtiyoriy)</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="w-full mt-1 p-2 border rounded-lg"
        />
      </div>
      {items.map((item, index) => (
        <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={item.title || ''}
              onChange={(e) => updateItem(index, { title: e.target.value })}
              className="flex-1 p-2 border rounded-lg"
              placeholder="Savol yoki sarlavha"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={item.content || ''}
            onChange={(e) => updateItem(index, { content: e.target.value })}
            className="w-full p-2 border rounded-lg"
            rows={2}
            placeholder="Javob yoki tarkib"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accent"
      >
        + Element qo'shish
      </button>
    </div>
  );
};

// Module editor mapping
const moduleEditors = {
  hero: HeroEditor,
  image_text: ImageTextEditor,
  features: FeaturesEditor,
  gallery: GalleryEditor,
  image_sequence: ImageSequenceEditor,
  text: TextEditor,
  comparison: ComparisonEditor,
  accordion: AccordionEditor,
};

// Single module wrapper
const ModuleEditor = ({ module, index, total, onChange, onRemove, onMoveUp, onMoveDown }) => {
  const [collapsed, setCollapsed] = useState(false);
  const ModuleEditorComponent = moduleEditors[module.type];
  const moduleType = MODULE_TYPES.find((t) => t.type === module.type);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700"
        >
          <span>{moduleType?.icon}</span>
          <span>{moduleType?.label || module.type}</span>
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {!collapsed && ModuleEditorComponent && (
        <div className="p-3">
          <ModuleEditorComponent data={module} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

// Main A+ Editor component
const APlusEditor = ({ value, onChange }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Parse value
  let content = { modules: [] };
  if (value) {
    if (typeof value === 'string') {
      try {
        content = JSON.parse(value);
      } catch {
        content = { modules: [] };
      }
    } else {
      content = value;
    }
  }
  const modules = content.modules || [];

  const updateModules = (newModules) => {
    onChange({ modules: newModules });
  };

  const addModule = (type) => {
    updateModules([...modules, getDefaultModuleData(type)]);
    setShowAddMenu(false);
  };

  const updateModule = (index, newData) => {
    const newModules = [...modules];
    newModules[index] = newData;
    updateModules(newModules);
  };

  const removeModule = (index) => {
    updateModules(modules.filter((_, i) => i !== index));
  };

  const moveModule = (index, direction) => {
    const newModules = [...modules];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= modules.length) return;
    [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];
    updateModules(newModules);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">A+ Kontent (Qo'shimcha ma'lumot)</label>
        {modules.length > 0 && (
          <span className="text-xs text-gray-500">{modules.length} modul</span>
        )}
      </div>

      {modules.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Hozircha modul yo'q. Qo'shish uchun pastdagi tugmani bosing.
        </p>
      ) : (
        <div className="space-y-2">
          {modules.map((module, index) => (
            <ModuleEditor
              key={index}
              module={module}
              index={index}
              total={modules.length}
              onChange={(newData) => updateModule(index, newData)}
              onRemove={() => removeModule(index)}
              onMoveUp={() => moveModule(index, -1)}
              onMoveDown={() => moveModule(index, 1)}
            />
          ))}
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-accent hover:text-accent flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Modul qo'shish
        </button>

        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
            {MODULE_TYPES.map((type) => (
              <button
                key={type.type}
                type="button"
                onClick={() => addModule(type.type)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
              >
                <span className="text-xl">{type.icon}</span>
                <span className="text-sm font-medium text-gray-700">{type.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default APlusEditor;
