import { NextResponse } from "next/server";
import { loadCatalog, getTopNavLinks, ensureTopNav } from "@/data/catalog";

export async function GET() {
  const catalog = await loadCatalog();
  ensureTopNav(catalog);
  return NextResponse.json({
    links: getTopNavLinks(catalog),
    slots: catalog.topNav,
  });
}
