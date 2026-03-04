import { useContext, useState, useEffect } from 'react';
import { Users, Copy, Share2, Gift, UserPlus, Award, Link as LinkIcon, LogIn } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { copyToClipboard, loadFromLocalStorage } from '../../utils/helpers';
import { generateReferralLink, shareReferralLink } from '../../utils/telegram';
import { useToast } from '../../context/ToastContext';

const ReferralsPage = ({ hideHeader = false, onNavigate }) => {
  const { user } = useContext(UserContext);

  // Get referral commission percentage from config
  const [commissionRate, setCommissionRate] = useState(10);

  useEffect(() => {
    const bonusConfig = loadFromLocalStorage('bonusConfig', { referralCommission: 10 });
    setCommissionRate((bonusConfig?.referralCommission ?? 10) || 10);
  }, []);

  // Guest users cannot access referrals
  if (user?.isGuest) {
    return (
      <div className={hideHeader ? 'pt-16' : 'pb-20 pt-16 bg-gray-50 min-h-screen'}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <Users className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Referral dasturi</h2>
          <p className="text-gray-500 mb-6">
            Do'stlaringizni taklif qiling va bonus ball oling. Tizimga kiring va referral kodingizni oling.
          </p>
          <button
            onClick={() => onNavigate && onNavigate('login', { returnTo: 'referrals' })}
            className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Kirish
          </button>
        </div>
      </div>
    );
  }

  const referralLink = generateReferralLink(user.referralCode);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      toast.success('Referral link nusxalandi!');
    }
  };

  const handleShareLink = () => {
    shareReferralLink(user.referralCode, null, user.name);
  };

  return (
    <div className={hideHeader ? 'pt-16' : 'pb-20 pt-16 bg-gray-50 min-h-screen'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-accent to-red-700 text-white p-6">
        <div className="text-center mb-6">
          <Users className="w-16 h-16 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">Taklif et va daromad ol</h2>
          <p className="text-sm opacity-90">
            Do'stlaringizni taklif qiling va bonus ball ishlang!
          </p>
        </div>

        {/* Total Referrals */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
          <p className="text-sm opacity-90 mb-2">Jami takliflar</p>
          <p className="text-5xl font-bold">{user.referrals}</p>
          <p className="text-sm opacity-90 mt-2">
            Har bir taklif qilingan do'stingizning xarididan {commissionRate}% komissiya olasiz!
          </p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Referral Link */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Sizning referral havolangiz</h3>

          <div className="bg-gradient-to-r from-primary to-gray-700 text-white rounded-lg p-6 mb-4">
            <div className="flex items-center justify-center mb-4">
              <LinkIcon className="w-12 h-12" />
            </div>
            <p className="text-center text-sm font-mono break-all px-2 py-3 bg-white/10 rounded-lg backdrop-blur-sm">
              {referralLink}
            </p>
            <p className="text-center text-xs opacity-75 mt-3">
              Do'stlaringizga ulashing va mukofot ishlang!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              <Copy className="w-5 h-5" />
              Nusxalash
            </button>
            <button
              onClick={handleShareLink}
              className="flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Ulashish
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Qanday ishlaydi?</h3>

          <div className="space-y-4">
            <Step
              icon={Share2}
              title="Kodingizni ulashing"
              description="Noyob referral kodingizni do'st va oila a'zolaringizga yuboring"
              color="bg-accent"
            />
            <Step
              icon={Gift}
              title="Do'stingiz xarid qiladi"
              description={`Do'stingiz xarididan ${commissionRate}% bonus ball oladi`}
              color="bg-warning"
            />
            <Step
              icon={Award}
              title="Siz komissiya olasiz"
              description={`Do'stingizning xaridi summasidan ${commissionRate}% komissiya ishlaysiz`}
              color="bg-success"
            />
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Referral imtiyozlari</h3>

          <div className="space-y-3">
            <Benefit
              icon={UserPlus}
              text="Cheksiz takliflar — qancha ko'p ulashsangiz, shuncha ko'p ishlaysiz!"
            />
            <Benefit
              icon={Award}
              text={`Har bir taklif qilingan do'stingizning xarididan ${commissionRate}% komissiya`}
            />
            <Benefit
              icon={Gift}
              text={`Do'stlaringiz o'z xaridlaridan ${commissionRate}% bonus ball oladi`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const Step = ({ icon: Icon, title, description, color }) => {
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
