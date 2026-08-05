import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let email = "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    email = body.email;
  } else {
    const form = await req.formData();
    email = String(form.get("email") || "");
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Production: persist to mailing list provider
  console.log(`[newsletter] subscribed: ${email}`);
  return NextResponse.redirect(new URL("/?subscribed=1", req.url));
}
