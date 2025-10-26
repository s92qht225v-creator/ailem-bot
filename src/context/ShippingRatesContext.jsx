import { createContext, useState, useEffect } from 'react';
import { shippingRatesAPI } from '../services/api';

export const ShippingRatesContext = createContext();

export const ShippingRatesProvider = ({ children }) => {
  const [shippingRates, setShippingRates] = useState([
    // Default rates (used as fallback)
    { id: 1, courier: 'BTS', state: 'Tashkent Region', firstKg: 15000, additionalKg: 5000 },
    { id: 2, courier: 'BTS', state: 'Samarkand Region', firstKg: 20000, additionalKg: 7000 },
    { id: 3, courier: 'Starex', state: 'Tashkent Region', firstKg: 18000, additionalKg: 6000 },
    { id: 4, courier: 'EMU', state: 'Tashkent Region', firstKg: 12000, additionalKg: 4000 },
    { id: 5, courier: 'UzPost', state: 'Tashkent Region', firstKg: 10000, additionalKg: 3000 },
    { id: 6, courier: 'Yandex', state: 'Tashkent', firstKg: 25000, additionalKg: 0 },
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

  const addShippingRate = async (rate) => {
    try {
      const newRate = await shippingRatesAPI.create(rate);
      setShippingRates([...shippingRates, newRate]);
      return newRate;
    } catch (error) {
      console.error('Failed to add shipping rate:', error);
      throw error;
    }
  };

  const updateShippingRate = async (id, updatedData) => {
    try {
      const updated = await shippingRatesAPI.update(id, updatedData);
      setShippingRates(shippingRates.map(rate =>
        rate.id === id ? updated : rate
      ));
      return updated;
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
  const calculateShippingCost = (courier, state, totalWeight) => {
    // For Yandex, state is actually the city (Tashkent)
    const rate = shippingRates.find(r =>
      r.courier === courier &&
      (r.state === state || (courier === 'Yandex' && state === 'Tashkent'))
    );

    if (!rate) {
      return 0; // No rate found, return 0 or handle differently
    }

    // For Yandex (flat rate)
    if (courier === 'Yandex') {
      return rate.firstKg;
    }

    // For other couriers (first kg + additional kgs)
    if (totalWeight <= 1) {
      return rate.firstKg;
    }

    const additionalWeight = Math.ceil(totalWeight - 1); // Round up additional weight
    return rate.firstKg + (additionalWeight * rate.additionalKg);
  };

  // Get rates by courier
  const getRatesByCourier = (courier) => {
    return shippingRates.filter(rate => rate.courier === courier);
  };

  // Get rate for specific courier and state
  const getRate = (courier, state) => {
    return shippingRates.find(r =>
      r.courier === courier && r.state === state
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
        reload: loadShippingRates
      }}
    >
      {children}
    </ShippingRatesContext.Provider>
  );
};
