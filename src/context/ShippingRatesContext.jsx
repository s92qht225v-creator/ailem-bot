import { createContext, useState, useEffect } from 'react';
import { shippingRatesAPI } from '../services/api';

export const ShippingRatesContext = createContext();

export const ShippingRatesProvider = ({ children }) => {
  const [shippingRates, setShippingRates] = useState([
    // Default rates in Uzbek (used as fallback)
    { id: 1, courier: 'BTS', state: 'Toshkent viloyati', firstKg: 15000, additionalKg: 5000 },
    { id: 2, courier: 'BTS', state: 'Samarqand viloyati', firstKg: 20000, additionalKg: 7000 },
    { id: 3, courier: 'Starex', state: 'Toshkent viloyati', firstKg: 18000, additionalKg: 6000 },
    { id: 4, courier: 'EMU', state: 'Toshkent viloyati', firstKg: 12000, additionalKg: 4000 },
    { id: 5, courier: 'UzPost', state: 'Toshkent viloyati', firstKg: 10000, additionalKg: 3000 },
    { id: 6, courier: 'Yandex', state: 'Toshkent', firstKg: 25000, additionalKg: 0 },
  ]);
  const [loading, setLoading] = useState(true);

  // Load shipping rates from database on mount
  useEffect(() => {
    loadShippingRates();
  }, []);

  const loadShippingRates = async () => {
    try {
      const rates = await shippingRatesAPI.getAll();
      setShippingRates(rates);
    } catch (error) {
      console.error('Failed to load shipping rates:', error);
      // Keep default rates on error
    } finally {
      setLoading(false);
    }
  };

  const addShippingRate = async (rateData) => {
    try {
      const newRate = await shippingRatesAPI.create(rateData);
      setShippingRates([...shippingRates, newRate]);
      return newRate;
    } catch (error) {
      console.error('Failed to add shipping rate:', error);
      throw error;
    }
  };

  const updateShippingRate = async (id, rateData) => {
    try {
      const updatedRate = await shippingRatesAPI.update(id, rateData);
      setShippingRates(shippingRates.map(rate =>
        rate.id === id ? updatedRate : rate
      ));
      return updatedRate;
    } catch (error) {
      console.error('Failed to update shipping rate:', error);
      throw error;
    }
  };

  const deleteShippingRate = async (id) => {
    try {
      await shippingRatesAPI.delete(id);
      setShippingRates(shippingRates.filter(rate => rate.id !== id));
    } catch (error) {
      console.error('Failed to delete shipping rate:', error);
      throw error;
    }
  };

  // Calculate shipping cost based on courier, state, and total weight
  // Everything in Uzbek now - direct matching with trimmed whitespace
  const calculateShippingCost = (courier, state, totalWeight) => {
    const isYandex = courier === 'Yandex';
    const stateTrimmed = state?.trim();

    const rate = shippingRates.find(r => {
      if (r.courier !== courier) return false;

      // Direct match with trimmed whitespace
      return r.state?.trim() === stateTrimmed;
    });

    if (!rate) {
      console.warn(`No shipping rate found for courier: ${courier}, state: ${stateTrimmed}`);
      console.warn('Available rates for this courier:', shippingRates.filter(r => r.courier === courier).map(r => `"${r.state}"`));
      return 0;
    }

    // For Yandex (flat rate)
    if (isYandex) {
      return rate.firstKg;
    }

    // For other couriers (first kg + additional kgs)
    if (totalWeight <= 1) {
      return rate.firstKg;
    }

    const additionalWeight = Math.ceil(totalWeight - 1);
    return rate.firstKg + (additionalWeight * rate.additionalKg);
  };

  // Get rates by courier
  const getRatesByCourier = (courier) => {
    return shippingRates.filter(rate => rate.courier === courier);
  };

  // Get rate for specific courier and state
  const getRate = (courier, state) => {
    const stateTrimmed = state?.trim();
    return shippingRates.find(r =>
      r.courier === courier && r.state?.trim() === stateTrimmed
    );
  };

  return (
    <ShippingRatesContext.Provider
      value={{
        shippingRates,
        loading,
        addShippingRate,
        updateShippingRate,
        deleteShippingRate,
        calculateShippingCost,
        getRatesByCourier,
        getRate,
        loadShippingRates
      }}
    >
      {children}
    </ShippingRatesContext.Provider>
  );
};
