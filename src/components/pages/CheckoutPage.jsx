import { useState, useContext, useEffect } from 'react';
import { t } from "../../utils/translation-fallback";
import { MapPin, Clock, Phone } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { UserContext } from '../../context/UserContext';
import { PickupPointsContext } from '../../context/PickupPointsContext';
import { ShippingRatesContext } from '../../context/ShippingRatesContext';
import { formatPrice, bonusPointsToDollars, calculateMaxBonusUsage } from '../../utils/helpers';
import { useBackButton } from '../../hooks/useBackButton';
import CustomDropdown from '../common/CustomDropdown';

// Tashkent districts for Yandex delivery
const TASHKENT_DISTRICTS = [
  'Bektemir',
  'Chilonzor',
  'Mirobod',
  'Mirzo Ulug\'bek',
  'Sergeli',
  'Shayxontohur',
  'Uchtepa',
  'Yashnobod',
  'Yakkasaroy',
  'Yunusobod',
  'Olmazor'
];

const CheckoutPage = ({ onNavigate }) => {
  const { getCartTotal, cartItems } = useCart();
  const { user } = useContext(UserContext);
  const {
    getCourierServices,
    getStatesByCourier,
    getCitiesByCourierAndState,
    getPickupPointsByCourierStateCity
  } = useContext(PickupPointsContext);
  const { calculateShippingCost, getRate } = useContext(ShippingRatesContext);

  // Format phone number helper
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');

    // Ensure it starts with +998
    if (!cleaned.startsWith('+998')) {
      return '+998 ';
    }

    // Get digits after +998
    const digits = cleaned.slice(4);

    // Format: +998 90 111 11 11
    let formatted = '+998';
    if (digits.length > 0) {
      formatted += ' ' + digits.slice(0, 2);
    }
    if (digits.length > 2) {
      formatted += ' ' + digits.slice(2, 5);
    }
    if (digits.length > 5) {
      formatted += ' ' + digits.slice(5, 7);
    }
    if (digits.length > 7) {
      formatted += ' ' + digits.slice(7, 9);
    }

    return formatted;
  };

  const [formData, setFormData] = useState({
    fullName: user.name || '',
    phone: user.phone?.startsWith('+998') ? formatPhoneNumber(user.phone) : '+998 '
  });

  const [useBonusPoints, setUseBonusPoints] = useState(false);

  // Common state
  const [pickupCourier, setPickupCourier] = useState('');

  // Yandex specific state
  const [yandexDistrict, setYandexDistrict] = useState('');
  const [yandexAddress, setYandexAddress] = useState('');

  // Other couriers state
  const [pickupState, setPickupState] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(null);

  // Available options for other couriers
  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [availablePickupPoints, setAvailablePickupPoints] = useState([]);

  // Get all courier services including Yandex
  const allCouriers = ['Yandex', ...getCourierServices()];

  // Use native Telegram BackButton
  useBackButton(() => onNavigate('cart'));

  // Reset fields when courier changes
  useEffect(() => {
    setYandexDistrict('');
    setYandexAddress('');
    setPickupState('');
    setPickupCity('');
    setSelectedPickupPoint(null);
    setAvailableStates([]);
    setAvailableCities([]);
    setAvailablePickupPoints([]);
  }, [pickupCourier]);

  // Update available states when non-Yandex courier is selected
  useEffect(() => {
    if (pickupCourier && pickupCourier !== 'Yandex') {
      const states = getStatesByCourier(pickupCourier);
      console.log('🔍 Checkout Debug:', {
        pickupCourier,
        availableStates: states,
        statesCount: states.length
      });
      setAvailableStates(states);
      setPickupState('');
      setPickupCity('');
      setSelectedPickupPoint(null);
    }
  }, [pickupCourier, getStatesByCourier]);

  // Update available cities when state changes
  useEffect(() => {
    if (pickupCourier && pickupCourier !== 'Yandex' && pickupState) {
      const cities = getCitiesByCourierAndState(pickupCourier, pickupState);
      setAvailableCities(cities);
      setPickupCity('');
      setSelectedPickupPoint(null);
    }
  }, [pickupCourier, pickupState, getCitiesByCourierAndState]);

  // Update available pickup points when city changes
  useEffect(() => {
    if (pickupCourier && pickupCourier !== 'Yandex' && pickupState && pickupCity) {
      const points = getPickupPointsByCourierStateCity(pickupCourier, pickupState, pickupCity);
      setAvailablePickupPoints(points);
      setSelectedPickupPoint(null);
    }
  }, [pickupCourier, pickupState, pickupCity, getPickupPointsByCourierStateCity]);

  const subtotal = getCartTotal();

  // Calculate total weight from cart items (default to 0.5kg if weight not specified)
  const totalWeight = cartItems.reduce((total, item) => {
    const itemWeight = item.weight || 0.5; // Default 0.5kg per item if not specified
    return total + (itemWeight * item.quantity);
  }, 0);

  // Calculate delivery fee based on courier, state/city, and total weight
  const getDeliveryState = () => {
    if (pickupCourier === 'Yandex') {
      return 'Tashkent'; // Yandex uses city as state
    }
    return pickupState || selectedPickupPoint?.state || '';
  };

  const deliveryFee = pickupCourier && getDeliveryState()
    ? calculateShippingCost(pickupCourier, getDeliveryState(), totalWeight)
    : 0;

  // Get the shipping rate to check payment type
  const selectedRate = pickupCourier && getDeliveryState()
    ? getRate(pickupCourier, getDeliveryState())
    : null;
  const isShippingPrepaid = selectedRate?.paymentType !== 'postpaid';

  const maxBonusPoints = calculateMaxBonusUsage(subtotal);
  const availableBonusPoints = Math.min(user.bonusPoints, maxBonusPoints);
  const bonusDiscount = useBonusPoints ? bonusPointsToDollars(availableBonusPoints) : 0;

  // Only include delivery fee in total if it's prepaid
  const total = subtotal - bonusDiscount + (isShippingPrepaid ? deliveryFee : 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for phone field
    if (name === 'phone') {
      // Format the phone number
      const formatted = formatPhoneNumber(value);

      // Limit to 9 digits after +998 (total formatted: +998 90 111 11 11 = 17 chars with spaces)
      const digitsOnly = formatted.replace(/[^\d]/g, '').slice(3); // Get digits after 998
      if (digitsOnly.length > 9) {
        return; // Don't allow more than 9 digits
      }

      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName || !formData.phone) {
      alert(t('checkout.required'));
      return;
    }

    if (!pickupCourier) {
      alert(t('checkout.selectCourier'));
      return;
    }

    // Yandex validation
    if (pickupCourier === 'Yandex') {
      if (!yandexDistrict || !yandexAddress) {
        alert(t('checkout.selectDistrictAddress'));
        return;
      }
    } else {
      // Other couriers validation
      if (!selectedPickupPoint) {
        alert(t('checkout.selectPickupPoint'));
        return;
      }
    }

    // Prepare delivery info based on courier type
    const deliveryInfo = pickupCourier === 'Yandex'
      ? {
          courier: pickupCourier,
          district: yandexDistrict,
          address: yandexAddress,
          city: 'Tashkent', // Yandex is Tashkat-only
          state: 'Tashkent Region',
          type: 'home_delivery',
          fullName: formData.fullName,
          phone: formData.phone
        }
      : {
          courier: pickupCourier,
          pickupPoint: selectedPickupPoint,
          address: selectedPickupPoint?.address || '',
          city: selectedPickupPoint?.city || pickupCity || '',
          state: selectedPickupPoint?.state || pickupState || 'N/A',
          type: 'pickup',
          fullName: formData.fullName,
          phone: formData.phone
        };

    // Pass checkout data to payment page
    onNavigate('payment', {
      checkoutData: {
        ...formData,
        ...deliveryInfo,
        useBonusPoints,
        bonusPointsUsed: useBonusPoints ? availableBonusPoints : 0,
        bonusDiscount,
        subtotal,
        deliveryFee,
        total,
        shippingPaymentType: selectedRate?.paymentType || 'prepaid' // Track how shipping should be paid
      }
    });
  };

  return (
    <div className="pb-20 pt-16">
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <h2 className="text-2xl font-bold">{t('checkout.title')}</h2>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">{t('checkout.deliveryInfo')}</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('checkout.fullName')} *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('checkout.phone')} *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  // Prevent backspace/delete if cursor is at position 4 or before (before the space after +998)
                  const cursorPos = e.target.selectionStart;
                  if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPos <= 5) {
                    e.preventDefault();
                  }
                  // Prevent arrow left if at position 5
                  if (e.key === 'ArrowLeft' && cursorPos <= 5) {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => {
                  // If user clicks before +998, move cursor after it
                  if (e.target.selectionStart < 5) {
                    e.target.setSelectionRange(5, 5);
                  }
                }}
                placeholder="+998 90 111 11 11"
                maxLength={17}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Delivery Selection */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('checkout.deliveryMethod')} *
          </h3>

          <div className="space-y-4">
            {/* Courier Service Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                1. {t('checkout.selectCourierService')}
              </label>
              <CustomDropdown
                value={pickupCourier}
                onChange={(value) => setPickupCourier(value)}
                options={allCouriers}
                placeholder={`-- ${t('checkout.chooseCourier')} --`}
                required
              />
            </div>

            {/* Yandex: District + Manual Address */}
            {pickupCourier === 'Yandex' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    2. {t('checkout.selectDistrict')}
                  </label>
                  <CustomDropdown
                    value={yandexDistrict}
                    onChange={(value) => setYandexDistrict(value)}
                    options={TASHKENT_DISTRICTS}
                    placeholder={`-- ${t('checkout.chooseDistrict')} --`}
                    required
                  />
                </div>

                {yandexDistrict && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      3. {t('checkout.enterAddress')}
                    </label>
                    <textarea
                      value={yandexAddress}
                      onChange={(e) => setYandexAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      rows="3"
                      placeholder={t('checkout.addressPlaceholder')}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('checkout.deliverTo', { district: yandexDistrict })}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Other Couriers: State → City → Pickup Point */}
            {pickupCourier && pickupCourier !== 'Yandex' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    2. {t('checkout.selectState')}
                  </label>
                  <CustomDropdown
                    value={pickupState}
                    onChange={(value) => setPickupState(value)}
                    options={availableStates}
                    placeholder={`-- ${t('checkout.chooseState')} --`}
                    required
                  />
                </div>

                {pickupState && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      3. {t('checkout.city')}
                    </label>
                    <CustomDropdown
                      value={pickupCity}
                      onChange={(value) => setPickupCity(value)}
                      options={availableCities}
                      placeholder={`-- ${t('checkout.selectCity')} --`}
                      required
                    />
                  </div>
                )}

                {pickupState && pickupCity && availablePickupPoints.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      4. {t('checkout.selectPickupLocation')}
                    </label>
                    <div className="space-y-2">
                      {availablePickupPoints.map((point) => (
                        <label
                          key={point.id}
                          className={`flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedPickupPoint?.id === point.id
                              ? 'border-accent bg-accent/5'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="pickupPoint"
                              value={point.id}
                              checked={selectedPickupPoint?.id === point.id}
                              onChange={() => setSelectedPickupPoint(point)}
                              className="w-4 h-4 text-accent mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{point.address}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {point.workingHours}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {point.phone}
                                </span>
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {pickupState && pickupCity && availablePickupPoints.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <p className="text-sm text-yellow-800">{t('checkout.noPickupPoints')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bonus Points */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">{t('cart.bonusPoints')}</h3>

          <div className="mb-3">
            <p className="text-sm text-gray-600">
              {t('cart.availableBonus', { points: user.bonusPoints })}
            </p>
            <p className="text-sm text-gray-600">
              {t('cart.maxBonus', { points: availableBonusPoints })}
              {' = '}{formatPrice(bonusPointsToDollars(availableBonusPoints))}
            </p>
          </div>

          {availableBonusPoints > 0 && (
            <label className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={useBonusPoints}
                onChange={(e) => setUseBonusPoints(e.target.checked)}
                className="w-5 h-5 text-accent"
              />
              <span>{t('cart.applyBonus')} ({formatPrice(bonusDiscount)})</span>
            </label>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">{t('checkout.orderSummary')}</h3>

          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>{t('cart.subtotal')}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {useBonusPoints && bonusDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>{t('cart.bonusDiscount')}</span>
                <span>-{formatPrice(bonusDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-700">{t('cart.delivery')}</span>
              <span className="font-semibold">
                {deliveryFee === 0 ? t('cart.deliveryFree') : formatPrice(deliveryFee)}
              </span>
            </div>

            {/* Show notice if shipping is postpaid */}
            {deliveryFee > 0 && !isShippingPrepaid && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                <p className="text-orange-800 font-medium">
                  ⚠️ Yetkazib berish to'lovi pickup punktida to'lanadi
                </p>
                <p className="text-orange-600 text-xs mt-1">
                  Yetkazib berish to'lovi ({formatPrice(deliveryFee)}) onlayn to'lovga kiritilmagan. Mahsulotni olishda to'lanadi.
                </p>
              </div>
            )}

            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between text-xl font-bold">
                <span>{t('cart.total')}</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          type="submit"
          className="w-full bg-accent text-white py-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          {t('checkout.placeOrder')}
        </button>
      </form>
    </div>
  );
};

export default CheckoutPage;
