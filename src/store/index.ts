import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductCardData } from "@/types";
import { calculateSalePrice } from "@/lib/utils";

type UIState = {
  mobileNavOpen: boolean;
  searchOpen: boolean;
  cartAnimating: boolean;
  setMobileNavOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  triggerCartAnimation: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  mobileNavOpen: false,
  searchOpen: false,
  cartAnimating: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  triggerCartAnimation: () => {
    set({ cartAnimating: true });
    setTimeout(() => set({ cartAnimating: false }), 600);
  },
}));

type WishlistState = {
  ids: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  setIds: (ids: string[]) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) => {
        const ids = get().ids;
        set({
          ids: ids.includes(productId)
            ? ids.filter((id) => id !== productId)
            : [...ids, productId],
        });
      },
      has: (productId) => get().ids.includes(productId),
      setIds: (ids) => set({ ids }),
    }),
    { name: "crafted-wishlist" }
  )
);

export type GuestCartItem = {
  id: string;
  quantity: number;
  product: ProductCardData;
};

type GuestCartState = {
  items: GuestCartItem[];
  addItem: (product: ProductCardData, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
};

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        const items = [...get().items];
        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
          existing.quantity = Math.min(
            product.stock,
            existing.quantity + quantity
          );
        } else {
          items.unshift({
            id: `guest-${product.id}`,
            quantity: Math.min(product.stock, quantity),
            product,
          });
        }
        set({ items });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity < 1) {
          set({ items: get().items.filter((i) => i.product.id !== productId) });
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId
              ? { ...i, quantity: Math.min(i.product.stock, quantity) }
              : i
          ),
        });
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.product.id !== productId) }),
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce(
          (sum, i) =>
            sum +
            calculateSalePrice(i.product.price, i.product.discount) * i.quantity,
          0
        ),
    }),
    { name: "crafted-guest-cart" }
  )
);

type CheckoutDraft = {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  deliveryInstructions: string;
  couponCode: string;
  setField: <K extends keyof Omit<CheckoutDraft, "setField" | "reset">>(
    key: K,
    value: CheckoutDraft[K]
  ) => void;
  reset: () => void;
};

const emptyCheckout = {
  shippingName: "",
  shippingPhone: "",
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingZip: "",
  shippingCountry: "US",
  deliveryInstructions: "",
  couponCode: "",
};

export const useCheckoutStore = create<CheckoutDraft>()(
  persist(
    (set) => ({
      ...emptyCheckout,
      setField: (key, value) => set({ [key]: value }),
      reset: () => set(emptyCheckout),
    }),
    { name: "crafted-checkout" }
  )
);
