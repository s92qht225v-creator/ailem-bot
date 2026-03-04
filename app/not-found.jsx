import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">404</div>
        <h2 className="text-gray-800 text-xl font-semibold mb-2">
          Sahifa topilmadi
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Kechirasiz, siz qidirayotgan sahifa mavjud emas.
        </p>
        <Link
          href="/"
          className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors inline-block"
        >
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  );
}
