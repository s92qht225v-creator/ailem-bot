import { useState } from 'react';
import HomePage from './components/pages/HomePage';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const navigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Ailem" />
      <main>
        <HomePage onNavigate={navigate} />
      </main>
      <BottomNav currentPage={currentPage} onNavigate={navigate} />
    </div>
  );
}

export default App;
