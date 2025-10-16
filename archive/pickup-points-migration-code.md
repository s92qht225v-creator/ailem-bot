# Pickup Points Migration to Supabase - Complete Code

## 1. Supabase SQL - Create Table and Migrate Data

```sql
-- Step 1: Create pickup_points table
CREATE TABLE IF NOT EXISTS pickup_points (
  id SERIAL PRIMARY KEY,
  courier_service TEXT NOT NULL,
  state TEXT,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  working_hours TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pickup_points ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on pickup_points"
ON pickup_points FOR SELECT USING (true);

-- Allow authenticated users to modify
CREATE POLICY "Allow authenticated users to modify pickup_points"
ON pickup_points FOR ALL USING (true) WITH CHECK (true);

-- Step 2: Insert demo pickup points
INSERT INTO pickup_points (courier_service, state, city, address, working_hours, phone, active)
VALUES
  ('BTS', 'Tashkent Region', 'Tashkent', 'Amir Temur Ave, 107A', '09:00 - 20:00', '+998 71 123 4567', true),
  ('Starex', 'Tashkent Region', 'Tashkent', 'Mirzo Ulugbek District, Buyuk Ipak Yuli 129', '09:00 - 20:00', '+998 71 123 4568', true),
  ('EMU', 'Tashkent Region', 'Tashkent', 'Sergeli District, Yangi Sergeli MFY', '09:00 - 21:00', '+998 71 234 5678', true),
  ('UzPost', 'Samarkand Region', 'Samarkand', 'Registan Street, 15', '09:00 - 19:00', '+998 66 234 5678', true),
  ('Yandex Go', 'Tashkent Region', 'Tashkent', 'Shaykhontohur District, Parkent Street 51', '10:00 - 22:00', '+998 71 345 6789', true),
  ('Click', 'Tashkent Region', 'Tashkent', 'Yashnobod District, Bogishamol Street 223', '09:00 - 20:00', '+998 71 456 7890', true);
```

---

## 2. API Layer - src/services/api.js

Add this section before the MIGRATION HELPERS section:

```javascript
// ============================================
// PICKUP POINTS API
// ============================================

export const pickupPointsAPI = {
  // Helper function to map database fields to app format
  _mapPickupPointFromDB(point) {
    return {
      id: point.id,
      courierService: point.courier_service,
      state: point.state,
      city: point.city,
      address: point.address,
      workingHours: point.working_hours,
      phone: point.phone,
      active: point.active
    };
  },

  // Get all active pickup points
  async getAll() {
    const { data, error } = await supabase
      .from('pickup_points')
      .select('*')
      .eq('active', true)
      .order('courier_service');

    if (error) throw error;

    return (data || []).map(point => this._mapPickupPointFromDB(point));
  },

  // Get all pickup points (including inactive - for admin)
  async getAllIncludingInactive() {
    const { data, error } = await supabase
      .from('pickup_points')
      .select('*')
      .order('courier_service');

    if (error) throw error;

    return (data || []).map(point => this._mapPickupPointFromDB(point));
  },

  // Get pickup points by courier service
  async getByCourier(courierService) {
    const { data, error } = await supabase
      .from('pickup_points')
      .select('*')
      .eq('courier_service', courierService)
      .eq('active', true)
      .order('city');

    if (error) throw error;

    return (data || []).map(point => this._mapPickupPointFromDB(point));
  },

  // Create pickup point
  async create(pickupPoint) {
    const dbPoint = {
      courier_service: pickupPoint.courierService,
      state: pickupPoint.state,
      city: pickupPoint.city,
      address: pickupPoint.address,
      working_hours: pickupPoint.workingHours,
      phone: pickupPoint.phone,
      active: pickupPoint.active !== false
    };

    const { data, error } = await supabase
      .from('pickup_points')
      .insert([dbPoint])
      .select()
      .single();

    if (error) throw error;

    return this._mapPickupPointFromDB(data);
  },

  // Update pickup point
  async update(id, updates) {
    const dbUpdates = {};
    if (updates.courierService !== undefined) dbUpdates.courier_service = updates.courierService;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.workingHours !== undefined) dbUpdates.working_hours = updates.workingHours;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.active !== undefined) dbUpdates.active = updates.active;

    const { data, error } = await supabase
      .from('pickup_points')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this._mapPickupPointFromDB(data);
  },

  // Delete pickup point
  async delete(id) {
    const { error } = await supabase
      .from('pickup_points')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
```

---

## 3. Context Provider - src/context/PickupPointsContext.jsx

Replace the entire file with this:

```javascript
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
```

---

## Key Changes Summary

### Database Schema
- **Table name**: `pickup_points`
- **Field mapping**:
  - App uses camelCase: `courierService`, `workingHours`
  - Database uses snake_case: `courier_service`, `working_hours`
- **Row Level Security**: Enabled with public read, authenticated write

### API Layer Changes
- Added complete CRUD API for pickup points
- Field transformation in `_mapPickupPointFromDB()` helper
- All methods handle Supabase errors properly

### Context Changes
- Removed localStorage dependency
- Added `loading` state for async data loading
- All CRUD operations now async with Supabase sync
- Proper error handling with console logs
- Context loads data on mount from Supabase

### Migration Steps
1. Run SQL in Supabase to create table
2. Insert 6 demo pickup points
3. Code automatically loads from Supabase
4. Old localStorage data no longer used

---

## Testing

After running the SQL migration:

1. **Check pickup points load**: Open DevTools Console, should see:
   ```
   📍 Loading pickup points from Supabase...
   ✅ Loaded pickup points: [6 items]
   ```

2. **Test checkout page**: Navigate to checkout, pickup points should display

3. **Test admin panel**: Add/edit/delete pickup points should sync to Supabase

4. **Verify in Supabase**: Check Table Editor for `pickup_points` table
