import { createContext, useState, useEffect } from 'react';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/helpers';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    return loadFromLocalStorage('cart', []);
  });

  useEffect(() => {
    saveToLocalStorage('cart', cartItems);
  }, [cartItems]);

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
