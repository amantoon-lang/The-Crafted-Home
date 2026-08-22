import { NextResponse } from "next/server";
import { loadCatalog, getCatalogCategories } from "@/data/catalog";

export async function GET() {
  const catalog = await loadCatalog();
  return NextResponse.json({ categories: getCatalogCategories(catalog) });
}
