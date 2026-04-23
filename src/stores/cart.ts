"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  image: string;
  unitPrice: number;
  quantity: number;
  slug: string;
};

type CartKey = Pick<CartItem, "productId" | "variantId">;

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (key: CartKey) => void;
  updateQuantity: (key: CartKey, quantity: number) => void;
  clear: () => void;
};

const sameLine = (a: CartKey, b: CartKey) =>
  a.productId === b.productId && a.variantId === b.variantId;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item) ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => !sameLine(i, key)) })),
      updateQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => !sameLine(i, key))
              : state.items.map((i) => (sameLine(i, key) ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "simplepet-cart", version: 1 },
  ),
);

export const selectTotalItems = (state: CartState) =>
  state.items.reduce((acc, i) => acc + i.quantity, 0);

export const selectSubtotal = (state: CartState) =>
  state.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
