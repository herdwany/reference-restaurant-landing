import type { CartItem, CartSource } from "../data/restaurantConfig";
import { useLocalStorage } from "./useLocalStorage";

interface CartProduct {
  id: string;
  name: string;
  price: number;
  image: string;
}

const createCartId = (source: CartSource, sourceId: string) => `${source}:${sourceId}`;

export function useCart() {
  const [items, setItems] = useLocalStorage<CartItem[]>("restaurant-cart", []);

  const addItem = (product: CartProduct, source: CartSource, quantity = 1) => {
    const id = createCartId(source, product.id);
    setItems((current) => {
      const existing = current.find((item) => item.id === id);
      if (existing) {
        return current.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }

      return [
        ...current,
        {
          id,
          sourceId: product.id,
          source,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity,
        },
      ];
    });
  };

  const incrementItem = (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  };

  const decrementItem = (id: string) => {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.id !== id) {
          return item;
        }

        return item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : [];
      }),
    );
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => setItems([]);

  return {
    items,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
  };
}
