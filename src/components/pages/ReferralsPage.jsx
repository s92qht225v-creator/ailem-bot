import { useContext, useState, useEffect } from 'react';
import { Users, Copy, Share2, Gift, UserPlus, Award, Link as LinkIcon } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { copyToClipboard, formatPrice, loadFromLocalStorage } from '../../utils/helpers';
import { generateReferralLink, shareReferralLink } from '../../utils/telegram';

// Telegram bot username
const BOT_USERNAME = 'ailemuz_bot';

const ReferralsPage = ({ hideHeader = false }) => {
  const { user } = useContext(UserContext);
  const referralLink = generateReferralLink(user.referralCode, BOT_USERNAME);

  // Get referral commission percentage from config
  const [commissionRate, setCommissionRate] = useState(10);

  useEffect(() => {
    const bonusConfig = loadFromLocalStorage('bonusConfig', { referralCommission: 10 });
    setCommissionRate((bonusConfig?.referralCommission ?? 10) || 10);
  }, []);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      alert('Referral link copied to clipboard!');
    }
  };

  const handleShareLink = () => {
    shareReferralLink(user.referralCode, BOT_USERNAME, user.name);
  };

  return (
    <div className={hideHeader ? '' : 'pb-20 bg-gray-50 min-h-screen'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-accent to-blue-600 text-white p-6">
        <div className="text-center mb-6">
          <Users className="w-16 h-16 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">Refer & Earn</h2>
          <p className="text-sm opacity-90">
            Share the love and earn bonus points!
          </p>
        </div>

        {/* Total Referrals */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
          <p className="text-sm opacity-90 mb-2">Total Referrals</p>
          <p className="text-5xl font-bold">{user.referrals}</p>
          <p className="text-sm opacity-90 mt-2">
            You earn {commissionRate}% commission on each referral's purchase!
          </p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Referral Link */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Your Referral Link</h3>

          <div className="bg-gradient-to-r from-primary to-gray-700 text-white rounded-lg p-6 mb-4">
            <div className="flex items-center justify-center mb-4">
              <LinkIcon className="w-12 h-12" />
            </div>
            <p className="text-center text-sm font-mono break-all px-2 py-3 bg-white/10 rounded-lg backdrop-blur-sm">
              {referralLink}
            </p>
            <p className="text-center text-xs opacity-75 mt-3">
              Share this link with friends to earn rewards!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              <Copy className="w-5 h-5" />
              Copy Link
            </button>
            <button
              onClick={handleShareLink}
              className="flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">How It Works</h3>

          <div className="space-y-4">
            <Step
              number={1}
              icon={Share2}
              title="Share Your Code"
              description="Send your unique referral code to friends and family"
              color="bg-accent"
            />
            <Step
              number={2}
              icon={Gift}
              title="Friend Makes Purchase"
              description={`Your friend earns ${commissionRate}% bonus on their purchase`}
              color="bg-warning"
            />
            <Step
              number={3}
              icon={Award}
              title="You Earn Commission"
              description={`Receive ${commissionRate}% of your friend's purchase amount as commission`}
              color="bg-success"
            />
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Referral Benefits</h3>

          <div className="space-y-3">
            <Benefit
              icon={UserPlus}
              text="Unlimited referrals - the more you share, the more you earn!"
            />
            <Benefit
              icon={Award}
              text={`${commissionRate}% commission on every referral's purchase`}
            />
            <Benefit
              icon={Gift}
              text={`Your friends earn ${commissionRate}% bonus points on their purchases`}
            />
          </div>
        </div>

        {/* Current Earnings */}
        <div className="bg-gradient-to-r from-success to-green-600 text-white rounded-lg shadow-md p-6 text-center">
          <Award className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm opacity-90 mb-2">Your Total Earnings</p>
          <p className="text-4xl font-bold">{formatPrice(user.bonusPoints)}</p>
          <p className="text-sm opacity-90 mt-2">
            From {user.referrals} successful referrals
          </p>
        </div>
      </div>
    </div>
  );
};

const Step = ({ number, icon: Icon, title, description, color }) => {
  return (
    <div className="flex gap-4">
      <div className={`${color} text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
};

const Benefit = ({ icon: Icon, text }) => {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
};

export default ReferralsPage;
