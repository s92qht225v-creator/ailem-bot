import { createContext, useState, useEffect, useContext } from 'react';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/helpers';
import { usersAPI } from '../services/api';
import { UserContext } from './UserContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const [cartItems, setCartItems] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Load cart from Supabase or localStorage on user change
  useEffect(() => {
    if (!user) return;

    const loadCart = async () => {
      try {
        // For real Telegram users, load from Supabase
        if (user.id !== 'demo-1') {
          const userData = await usersAPI.getById(user.id);
          const dbCart = userData.cart || [];
          const localCart = loadFromLocalStorage('cart', []);

          // Use localStorage if it has data, otherwise use database
          const userCart = localCart.length > 0 ? localCart : dbCart;
          console.log('📥 Loading cart:', { local: localCart.length, db: dbCart.length, using: userCart.length });
          setCartItems(userCart);

          // If we used localStorage, sync it back to database
          if (localCart.length > 0 && JSON.stringify(localCart) !== JSON.stringify(dbCart)) {
            usersAPI.updateCart(user.id, localCart)
              .then(() => {
                console.log('🔄 Synced localStorage cart to Supabase');
                // Clear localStorage after successful sync
                saveToLocalStorage('cart', []);
              })
              .catch(err => console.error('❌ Failed to sync cart to Supabase:', err));
          }
        } else {
          // Demo user - load from localStorage only
          const demoCart = loadFromLocalStorage('cart', []);
          console.log('📥 Loading cart from localStorage (demo user):', demoCart.length);
          setCartItems(demoCart);
        }
      } catch (err) {
        console.error('❌ Failed to load cart:', err);
        // Fallback to localStorage
        const savedCart = loadFromLocalStorage('cart', []);
        setCartItems(savedCart);
      } finally {
        setCartLoaded(true);
      }
    };

    loadCart();
  }, [user]);

  // Save cart to localStorage and Supabase whenever it changes
  useEffect(() => {
    if (!cartLoaded || !user) return;

    // Save to localStorage for all users (fallback)
    saveToLocalStorage('cart', cartItems);

    // Sync to Supabase for real users
    if (user.id !== 'demo-1') {
      usersAPI.updateCart(user.id, cartItems)
        .then(() => console.log('💾 Cart synced to Supabase'))
        .catch(err => {
          console.error('❌ Failed to sync cart to Supabase:', err);
          console.log('💾 Cart saved to localStorage as fallback');
        });
    }
  }, [cartItems, user, cartLoaded]);

  const addToCart = (product, quantity = 1, selectedColor = null, selectedSize = null) => {
    setCartItems(prev => {
      const existingItemIndex = prev.findIndex(
        item =>
          item.id === product.id &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize
      );

      if (existingItemIndex > -1) {
        // Update quantity if item exists
        const updated = [...prev];
        updated[existingItemIndex].quantity += quantity;
        return updated;
      } else {
        // Add new item
        return [...prev, {
          ...product,
          quantity,
          selectedColor,
          selectedSize,
          cartItemId: Date.now() + Math.random() // Unique ID for cart item
        }];
      }
    });
  };

  const removeFromCart = (cartItemId) => {
    setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems(prev =>
      prev.map(item =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartItemsCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
