import { create } from "zustand";
import { persist } from "zustand/middleware";

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
