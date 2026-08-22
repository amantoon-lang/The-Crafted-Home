"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Suspense, useState } from "react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/ui/motion";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/shop";
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Invalid email/username or password");
      return;
    }
    toast.success("Welcome back");
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="texture-bg flex min-h-[80vh] items-center justify-center px-4 py-16">
      <FadeIn className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your username or email and password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
          <div className="space-y-2">
            <Label htmlFor="email">Email or username</Label>
            <Input
              id="email"
              type="text"
              autoComplete="username"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => signIn("google", { callbackUrl })}
          >
            Continue with Google
          </Button>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can still browse and shop as a guest without signing in.
        </p>
      </FadeIn>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
