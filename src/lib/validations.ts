import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(24, "Username must be at most 24 characters")
      .regex(
        /^[a-zA-Z0-9._]+$/,
        "Username can only use letters, numbers, dots, and underscores"
      ),
    email: z.string().email("Enter a valid email"),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const checkoutSchema = z.object({
  shippingName: z.string().min(2, "Name is required"),
  shippingPhone: z.string().min(7, "Phone number is required"),
  shippingAddress: z.string().min(5, "Address is required"),
  shippingCity: z.string().min(2, "City is required"),
  shippingState: z.string().min(2, "State is required"),
  shippingZip: z.string().min(3, "ZIP is required"),
  shippingCountry: z.string().min(2, "Country is required"),
  deliveryInstructions: z.string().optional(),
  couponCode: z.string().optional(),
});

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "Please write at least 10 characters"),
});

export const addressSchema = z.object({
  label: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().min(7),
  line1: z.string().min(5),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  zip: z.string().min(3),
  country: z.string().min(2),
  isDefault: z.boolean().optional(),
});

export const productFilterSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["newest", "popularity", "price-asc", "price-desc"]).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(48).optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
