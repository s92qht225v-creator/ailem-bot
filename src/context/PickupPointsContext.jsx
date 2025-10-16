import { createContext, useState, useEffect } from 'react';
import { pickupPointsAPI } from '../services/api';

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
  const getCourierServices = () => {
    return [...new Set(pickupPoints.map(point => point.courierService))].sort();
  };

  // Get states by courier service
  const getStatesByCourier = (courierService) => {
    return [...new Set(
      pickupPoints
        .filter(point => point.courierService === courierService && point.active)
        .map(point => point.state)
    )].sort();
  };

  // Get cities by courier and state
  const getCitiesByCourierAndState = (courierService, state) => {
    return [...new Set(
      pickupPoints
        .filter(point =>
          point.courierService === courierService &&
          point.state === state &&
          point.active
        )
        .map(point => point.city)
    )].sort();
  };

  // Get pickup points by courier, state, and city
  const getPickupPointsByCourierStateCity = (courierService, state, city) => {
    return pickupPoints.filter(point =>
      point.courierService === courierService &&
      point.state === state &&
      point.city === city &&
      point.active
    );
  };

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
