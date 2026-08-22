import { NextResponse } from "next/server";
import { createAccount } from "@/lib/accounts";
import { signUpSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const result = await createAccount({
      name: parsed.data.name,
      username: parsed.data.username,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
    });

    if (result.error || !result.user) {
      return NextResponse.json(
        { error: result.error || "Registration failed" },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      username: result.user.username,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
