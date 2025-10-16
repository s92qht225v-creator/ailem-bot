import { createContext, useState, useEffect } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';

export const ShippingRatesContext = createContext();

export const ShippingRatesProvider = ({ children }) => {
  const [shippingRates, setShippingRates] = useState(() => {
    return loadFromLocalStorage('shippingRates', [
      // Sample rates structure:
      // { courier: 'BTS', state: 'Tashkent Region', firstKg: 15000, additionalKg: 5000 }
      { id: 1, courier: 'BTS', state: 'Tashkent Region', firstKg: 15000, additionalKg: 5000 },
      { id: 2, courier: 'BTS', state: 'Samarkand Region', firstKg: 20000, additionalKg: 7000 },
      { id: 3, courier: 'Starex', state: 'Tashkent Region', firstKg: 18000, additionalKg: 6000 },
      { id: 4, courier: 'EMU', state: 'Tashkent Region', firstKg: 12000, additionalKg: 4000 },
      { id: 5, courier: 'UzPost', state: 'Tashkent Region', firstKg: 10000, additionalKg: 3000 },
      { id: 6, courier: 'Yandex', state: 'Tashkent', firstKg: 25000, additionalKg: 0 }, // Flat rate for Yandex
    ]);
  });

  useEffect(() => {
    saveToLocalStorage('shippingRates', shippingRates);
  }, [shippingRates]);

  const addShippingRate = (rate) => {
    const newRate = {
      ...rate,
      id: Date.now()
    };
    setShippingRates([...shippingRates, newRate]);
  };

  const updateShippingRate = (id, updatedData) => {
    setShippingRates(shippingRates.map(rate =>
      rate.id === id ? { ...rate, ...updatedData } : rate
    ));
  };

  const deleteShippingRate = (id) => {
    setShippingRates(shippingRates.filter(rate => rate.id !== id));
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
        addShippingRate,
        updateShippingRate,
        deleteShippingRate,
        calculateShippingCost,
        getRatesByCourier,
        getRate
      }}
    >
      {children}
    </ShippingRatesContext.Provider>
  );
};
