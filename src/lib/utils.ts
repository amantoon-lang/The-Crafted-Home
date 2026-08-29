import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "INR") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateSalePrice(price: number, discount: number) {
  if (!discount) return price;
  return Math.round(price * (1 - discount / 100));
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDeliveryEstimate(daysMin = 3, daysMax = 7) {
  const start = new Date();
  const end = new Date();
  start.setDate(start.getDate() + daysMin);
  end.setDate(end.getDate() + daysMax);
  const fmt = new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
