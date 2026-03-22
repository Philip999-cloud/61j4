// services/paymentService.ts

export type SubscriptionTier = 'monthly' | 'half_year' | 'annual';

export interface ProductDetails {
  id: string;
  tier: SubscriptionTier;
  title: string;
  priceTwd: number;
  monthlyEquivalent: number;
  isPopular?: boolean;
}

export const SUBSCRIPTION_PRODUCTS: Record<SubscriptionTier, ProductDetails> = {
  monthly: {
    id: 'com.yourdomain.app.sub_monthly_350',
    tier: 'monthly',
    title: '月付方案',
    priceTwd: 350,
    monthlyEquivalent: 350,
  },
  half_year: {
    id: 'com.yourdomain.app.sub_halfyear_1680',
    tier: 'half_year',
    title: '半年學期方案',
    priceTwd: 1680,
    monthlyEquivalent: 280,
    isPopular: true,
  },
  annual: {
    id: 'com.yourdomain.app.sub_annual_3150',
    tier: 'annual',
    title: '年度衝刺方案',
    priceTwd: 3150,
    monthlyEquivalent: 262,
  }
};

const PAYMENT_API_URL = import.meta.env.VITE_PAYMENT_API_URL ?? '';

export const paymentService = {
  fetchProducts: async (): Promise<ProductDetails[]> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return Object.values(SUBSCRIPTION_PRODUCTS);
    } catch (err) {
      console.error('paymentService.fetchProducts:', err);
      return [];
    }
  },

  /**
   * 發起購買，呼叫後端金流 API。
   * 若未設定 VITE_PAYMENT_API_URL：在開發模式 (npm run dev) 下模擬成功，方便測試升級流程。
   */
  purchasePackage: async (productId: string, userId: string): Promise<boolean> => {
    try {
      if (!PAYMENT_API_URL) {
        if (import.meta.env.DEV) {
          console.warn('[Payment] 開發模式：模擬購買成功（未設定 VITE_PAYMENT_API_URL）');
          await new Promise((r) => setTimeout(r, 800));
          return true;
        }
        console.warn('[Payment] VITE_PAYMENT_API_URL 未設定');
        return false;
      }
      const res = await fetch(PAYMENT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, userId })
      });
      const data = await res.json().catch(() => ({}));
      return res.ok && data?.success === true;
    } catch (err) {
      console.error('paymentService.purchasePackage:', err);
      return false;
    }
  }
};