import { NextResponse } from "next/server";
import { getCatalogCategories } from "@/data/catalog";

export async function GET() {
  return NextResponse.json({ categories: getCatalogCategories() });
}
