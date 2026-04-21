import { api } from "@/convex/_generated/api";
import { convexClient } from "@/convex/client";

export async function POST(request: Request) {
  try {
    const { promoCode, userId } = await request.json();

    if (!promoCode || !userId) {
      return Response.json({ status: "error", error: "Missing promoCode or userId" }, { status: 400 });
    }

    const result = await convexClient.query(api.features.promo_codes.validatePromoCode, {
      promoCode: promoCode.toUpperCase(),
      userId,
    });

    return Response.json(result);
  } catch (error: any) {
    return Response.json({ status: "error", error: error.message || "Failed to validate promo code" }, { status: 500 });
  }
}
