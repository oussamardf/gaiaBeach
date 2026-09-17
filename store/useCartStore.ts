import { create } from "zustand";

export interface CartItem {
  id: number;
  nom: string;
  prix_unitaire: number;
  quantite: number;
  famille_id: number;
  famille_nom: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantite">) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantite: i.quantite + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantite: 1 }] };
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, delta) =>
    set((state) => {
      const items = state.items
        .map((i) =>
          i.id === id ? { ...i, quantite: i.quantite + delta } : i
        )
        .filter((i) => i.quantite > 0);
      return { items };
    }),

  clearCart: () => set({ items: [] }),

  getTotal: () =>
    get().items.reduce((sum, i) => sum + i.prix_unitaire * i.quantite, 0),
}));
