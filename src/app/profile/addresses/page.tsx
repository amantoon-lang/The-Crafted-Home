"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addressSchema } from "@/lib/validations";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AddressInput = z.infer<typeof addressSchema>;

type Address = AddressInput & { id: string };

export default function AddressesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: "US", label: "Home", isDefault: true },
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/profile/addresses");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((d) => setAddresses(d.addresses || []))
      .finally(() => setLoading(false));
  }, [status]);

  const onSubmit = async (data: AddressInput) => {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Failed to save");
      return;
    }
    setAddresses((prev) => [json.address, ...prev]);
    reset({ country: "US", label: "Home", isDefault: false });
    toast.success("Address saved");
  };

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">Addresses</h1>
      <div className="mt-8 space-y-4">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border p-5 text-sm">
            <p className="font-medium">
              {a.label} {a.isDefault && <span className="text-accent">(Default)</span>}
            </p>
            <p className="mt-2 text-muted-foreground">
              {a.name} · {a.phone}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.zip}, {a.country}
            </p>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 space-y-4 rounded-2xl border border-border p-6"
      >
        <h2 className="font-display text-2xl">Add address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input {...register("label")} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Phone</Label>
            <Input {...register("phone")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address line 1</Label>
            <Input {...register("line1")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address line 2</Label>
            <Input {...register("line2")} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input {...register("city")} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input {...register("state")} />
          </div>
          <div className="space-y-2">
            <Label>ZIP</Label>
            <Input {...register("zip")} />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input {...register("country")} />
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          Save address
        </Button>
      </form>
    </div>
  );
}
