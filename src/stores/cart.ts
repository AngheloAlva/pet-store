"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clampItemQuantity } from "@/lib/cart";
import { getVariantTotalStock } from "@/lib/stock";

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
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (key: CartKey) => void;
  updateQuantity: (key: CartKey, quantity: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
};

const sameLine = (a: CartKey, b: CartKey) =>
  a.productId === b.productId && a.variantId === b.variantId;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      addItem: (item, quantity = 1) =>
        set((state) => {
          const totalStock = getVariantTotalStock(item.variantId);
          const existing = state.items.find((i) => sameLine(i, item));
          const currentQty = existing?.quantity ?? 0;
          const nextQty = clampItemQuantity(currentQty + quantity, totalStock);
          if (nextQty === 0) return state;
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item) ? { ...i, quantity: nextQty } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: nextQty }] };
        }),
      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => !sameLine(i, key)) })),
      updateQuantity: (key, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => !sameLine(i, key)) };
          }
          const totalStock = getVariantTotalStock(key.variantId);
          const clamped = clampItemQuantity(quantity, totalStock);
          if (clamped <= 0) {
            return { items: state.items.filter((i) => !sameLine(i, key)) };
          }
          return {
            items: state.items.map((i) =>
              sameLine(i, key) ? { ...i, quantity: clamped } : i,
            ),
          };
        }),
      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: "simplepet-cart",
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const selectTotalItems = (state: CartState) =>
  state.items.reduce((acc, i) => acc + i.quantity, 0);

export const selectSubtotal = (state: CartState) =>
  state.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

export const selectIsOpen = (state: CartState) => state.isOpen;
export const selectItems = (state: CartState) => state.items;
