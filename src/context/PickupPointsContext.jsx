import { createContext, useState, useEffect, useCallback } from 'react';
import { pickupPointsAPI } from '../services/api';
import { translateLocation, normalizeLocationToEnglish } from '../utils/locationTranslations';

export const PickupPointsContext = createContext();

export const PickupPointsProvider = ({ children }) => {
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load pickup points from Supabase on mount
  useEffect(() => {
    const loadPickupPoints = async () => {
      try {
        console.log('📍 Loading pickup points from Supabase...');
        const data = await pickupPointsAPI.getAllIncludingInactive();
        console.log('✅ Loaded pickup points:', data);
        setPickupPoints(data);
      } catch (err) {
        console.error('❌ Failed to load pickup points:', err);
        // Show error but don't crash - allow empty state
        setPickupPoints([]);
      } finally {
        setLoading(false);
      }
    };

    loadPickupPoints();
  }, []);

  const addPickupPoint = async (pickupPoint) => {
    try {
      console.log('📍 Adding pickup point to Supabase:', pickupPoint);
      const newPickupPoint = await pickupPointsAPI.create({
        ...pickupPoint,
        active: true
      });
      console.log('✅ Pickup point added:', newPickupPoint);
      setPickupPoints([...pickupPoints, newPickupPoint]);
      return newPickupPoint;
    } catch (err) {
      console.error('❌ Failed to add pickup point:', err);
      throw err;
    }
  };

  const updatePickupPoint = async (id, updatedData) => {
    try {
      console.log('📍 Updating pickup point in Supabase:', id, updatedData);
      const updated = await pickupPointsAPI.update(id, updatedData);
      console.log('✅ Pickup point updated:', updated);
      setPickupPoints(pickupPoints.map(point =>
        point.id === id ? updated : point
      ));
      return updated;
    } catch (err) {
      console.error('❌ Failed to update pickup point:', err);
      throw err;
    }
  };

  const deletePickupPoint = async (id) => {
    try {
      console.log('📍 Deleting pickup point from Supabase:', id);
      await pickupPointsAPI.delete(id);
      console.log('✅ Pickup point deleted');
      setPickupPoints(pickupPoints.filter(point => point.id !== id));
    } catch (err) {
      console.error('❌ Failed to delete pickup point:', err);
      throw err;
    }
  };

  const togglePickupPointStatus = async (id) => {
    try {
      const point = pickupPoints.find(p => p.id === id);
      if (!point) return;

      const newStatus = !point.active;
      console.log('📍 Toggling pickup point status:', id, newStatus);
      await updatePickupPoint(id, { active: newStatus });
    } catch (err) {
      console.error('❌ Failed to toggle pickup point status:', err);
      throw err;
    }
  };

  const duplicatePickupPoint = async (id) => {
    try {
      const pointToDuplicate = pickupPoints.find(point => point.id === id);
      if (!pointToDuplicate) return;

      const { id: _, ...pointData } = pointToDuplicate;
      console.log('📍 Duplicating pickup point:', id);
      const newPickupPoint = await addPickupPoint(pointData);
      return newPickupPoint;
    } catch (err) {
      console.error('❌ Failed to duplicate pickup point:', err);
      throw err;
    }
  };

  // Get unique courier services
  const getCourierServices = useCallback(() => {
    return [...new Set(pickupPoints.map(point => point.courierService))].sort();
  }, [pickupPoints]);

  // Get states by courier service - translate to requested language
  const getStatesByCourier = useCallback((courierService, language = 'uz') => {
    return [...new Set(
      pickupPoints
        .filter(point =>
          point.courierService === courierService &&
          point.active
        )
        .map(point => {
          // First normalize to English, then translate to target language
          const englishState = normalizeLocationToEnglish(point.state, 'state');
          return translateLocation(englishState, language, 'state');
        })
    )].sort();
  }, [pickupPoints]);

  // Get cities by courier and state - translate to requested language
  const getCitiesByCourierAndState = useCallback((courierService, state, language = 'uz') => {
    // Normalize incoming state (might be translated from previous step)
    const normalizedState = normalizeLocationToEnglish(state, 'state'); // Convert back to English for matching

    return [...new Set(
      pickupPoints
        .filter(point => {
          const pointStateEnglish = normalizeLocationToEnglish(point.state, 'state');
          return point.courierService === courierService &&
            (pointStateEnglish === normalizedState || point.state === state) &&
            point.active;
        })
        .map(point => {
          // First normalize to English, then translate to target language
          const englishCity = normalizeLocationToEnglish(point.city, 'city');
          return translateLocation(englishCity, language, 'city');
        })
    )].sort();
  }, [pickupPoints]);

  // Get pickup points by courier, state, and city - translate address fields
  const getPickupPointsByCourierStateCity = useCallback((courierService, state, city, language = 'uz') => {
    // Normalize incoming state and city (might be translated from previous steps)
    const normalizedState = normalizeLocationToEnglish(state, 'state');
    const normalizedCity = normalizeLocationToEnglish(city, 'city');

    return pickupPoints
      .filter(point => {
        const pointStateEnglish = normalizeLocationToEnglish(point.state, 'state');
        const pointCityEnglish = normalizeLocationToEnglish(point.city, 'city');
        return point.courierService === courierService &&
          (pointStateEnglish === normalizedState || point.state === state) &&
          (pointCityEnglish === normalizedCity || point.city === city) &&
          point.active;
      })
      .map(point => {
        // First normalize to English, then translate to target language for display
        const englishState = normalizeLocationToEnglish(point.state, 'state');
        const englishCity = normalizeLocationToEnglish(point.city, 'city');
        return {
          ...point,
          state: translateLocation(englishState, language, 'state'),
          city: translateLocation(englishCity, language, 'city')
          // Note: Address stays in original form (Latin or whatever was entered)
        };
      });
  }, [pickupPoints]);

  return (
    <PickupPointsContext.Provider
      value={{
        pickupPoints,
        loading,
        addPickupPoint,
        updatePickupPoint,
        deletePickupPoint,
        togglePickupPointStatus,
        duplicatePickupPoint,
        getCourierServices,
        getStatesByCourier,
        getCitiesByCourierAndState,
        getPickupPointsByCourierStateCity
      }}
    >
      {children}
    </PickupPointsContext.Provider>
  );
};
