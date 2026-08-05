/**
 * Payment provider abstraction.
 * Swap Stripe for Razorpay by implementing PaymentProvider and updating createPaymentProvider().
 */

export type PaymentIntentResult = {
  provider: "stripe" | "demo" | "razorpay";
  clientSecret?: string | null;
  paymentIntentId: string;
  checkoutUrl?: string | null;
  demoMode: boolean;
};

export type ConfirmPaymentResult = {
  success: boolean;
  paymentIntentId: string;
  status: "paid" | "failed" | "pending";
  message?: string;
};

export interface PaymentProvider {
  name: string;
  createPaymentIntent(input: {
    amount: number;
    currency?: string;
    orderId: string;
    customerEmail: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntentResult>;
  confirmPayment(paymentIntentId: string): Promise<ConfirmPaymentResult>;
}

class DemoPaymentProvider implements PaymentProvider {
  name = "demo";

  async createPaymentIntent(input: {
    amount: number;
    orderId: string;
  }): Promise<PaymentIntentResult> {
    const id = `demo_pi_${input.orderId}`;
    return {
      provider: "demo",
      paymentIntentId: id,
      clientSecret: id,
      demoMode: true,
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<ConfirmPaymentResult> {
    if (paymentIntentId.includes("fail")) {
      return {
        success: false,
        paymentIntentId,
        status: "failed",
        message: "Demo payment failed",
      };
    }
    return {
      success: true,
      paymentIntentId,
      status: "paid",
      message: "Demo payment successful",
    };
  }
}

class StripePaymentProvider implements PaymentProvider {
  name = "stripe";

  private async getStripe() {
    const Stripe = (await import("stripe")).default;
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia" as never,
    });
  }

  async createPaymentIntent(input: {
    amount: number;
    currency?: string;
    orderId: string;
    customerEmail: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntentResult> {
    const stripe = await this.getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100),
      currency: input.currency ?? "usd",
      receipt_email: input.customerEmail,
      metadata: {
        orderId: input.orderId,
        ...input.metadata,
      },
      automatic_payment_methods: { enabled: true },
    });

    return {
      provider: "stripe",
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      demoMode: false,
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<ConfirmPaymentResult> {
    const stripe = await this.getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status === "succeeded") {
      return { success: true, paymentIntentId, status: "paid" };
    }
    if (intent.status === "requires_payment_method" || intent.status === "canceled") {
      return { success: false, paymentIntentId, status: "failed" };
    }
    return { success: false, paymentIntentId, status: "pending" };
  }
}

/**
 * Razorpay stub — implement similarly when ready:
 * create order via Razorpay Orders API, return order id as paymentIntentId.
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  name = "razorpay";

  async createPaymentIntent(): Promise<PaymentIntentResult> {
    throw new Error("Razorpay provider not configured. Set RAZORPAY_KEY_ID/SECRET.");
  }

  async confirmPayment(paymentIntentId: string): Promise<ConfirmPaymentResult> {
    return { success: false, paymentIntentId, status: "failed", message: "Not configured" };
  }
}

export function createPaymentProvider(): PaymentProvider {
  if (process.env.STRIPE_SECRET_KEY) {
    return new StripePaymentProvider();
  }
  // Future: if (process.env.RAZORPAY_KEY_ID) return new RazorpayPaymentProvider();
  return new DemoPaymentProvider();
}
