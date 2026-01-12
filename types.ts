
export enum MoqLevel {
  LOW = 'Low MOQ',
  MED = 'Med MOQ',
  HIGH = 'High MOQ'
}

export interface ProductPricing {
  moq: number;
  unitCost: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  pricing: Record<MoqLevel, ProductPricing>;
  suggestedRetailPrice: number; // Inc VAT
  fbaFee: number; // Base fulfillment
  referralFeePercent: number;
  description: string;
}

export interface CalculationResult {
  unitCost: number;
  sellingPriceExVat: number;
  vatAmount: number;
  referralFee: number;
  fulfillmentFee: number;
  storageFee: number;
  inboundFee: number;
  agedInventoryFee: number;
  returnsFee: number;
  adSpendPerUnit: number;
  landingCost: number; 
  netProfitPerUnit: number;
  netProfitAfterTax: number;
  marginPercent: number;
  roiPercent: number;
  totalFees: number;
  // Financial Projections
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  dailyNetProfit: number;
  weeklyNetProfit: number;
  monthlyNetProfit: number;
  yearlyNetProfit: number;
  acos: number;
  tacos: number;
  roas: number;
  capitalRequired: number; // Cash for 90 days stock
  // Ad Recommendations
  recommendedDailyAdSpend: number;
  maxUnitAdSpend: number; // Spend to break even
  // Strategy Helpers
  effectiveDailyBudget: number;
  monthlyStorageFee: number;
}
