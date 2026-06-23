import Cookies from "js-cookie";

export type MerchantSession = {
  id: number;
  merchant_id: number;
  name?: string;
  email?: string;
  phone?: string;
};

export function getMerchantSession(): MerchantSession | null {
  const raw = Cookies.get("merchant_user");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const id = Number(parsed.id);
    const merchantId = Number(parsed.merchant_id);

    if (!id || !merchantId) return null;

    return {
      ...parsed,
      id,
      merchant_id: merchantId,
    };
  } catch {
    return null;
  }
}
