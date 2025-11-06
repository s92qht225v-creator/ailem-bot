import ProfilePage from './ProfilePage';

const AccountPage = ({ onNavigate }) => {
  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Content */}
      <div className="bg-gray-50">
        <ProfilePage onNavigate={onNavigate} hideHeader />
      </div>
    </div>
  );
};

export default AccountPage;
