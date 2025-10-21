import { useState, useContext } from 'react';
import ProfilePage from './ProfilePage';
import ReferralsPage from './ReferralsPage';

const AccountPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 text-center py-4">Account</h1>

        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'referrals'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Referrals
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-50">
        {activeTab === 'profile' && <ProfilePage onNavigate={onNavigate} hideHeader />}
        {activeTab === 'referrals' && <ReferralsPage hideHeader />}
      </div>
    </div>
  );
};

export default AccountPage;
