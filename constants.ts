
import { Product, MoqLevel } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'zinc',
    name: 'Zinc',
    category: 'Supplements',
    description: '100ml PET jar, 30 Capsules',
    suggestedRetailPrice: 15.59,
    fbaFee: 3.00,
    referralFeePercent: 0.15,
    pricing: {
      [MoqLevel.LOW]: { moq: 2000, unitCost: 2.25 },
      [MoqLevel.MED]: { moq: 5000, unitCost: 1.83 },
      [MoqLevel.HIGH]: { moq: 10000, unitCost: 1.56 },
    }
  },
  {
    id: 'tmg',
    name: 'TMG',
    category: 'Supplements',
    description: '150ml PET jar, 30 Capsules',
    suggestedRetailPrice: 23.99,
    fbaFee: 3.00,
    referralFeePercent: 0.15,
    pricing: {
      [MoqLevel.LOW]: { moq: 2000, unitCost: 2.92 },
      [MoqLevel.MED]: { moq: 5000, unitCost: 2.48 },
      [MoqLevel.HIGH]: { moq: 10000, unitCost: 2.14 },
    }
  },
  {
    id: 'magnesium',
    name: 'Magnesium',
    category: 'Supplements',
    description: '150ml PET jar, 60 Capsules',
    suggestedRetailPrice: 14.39,
    fbaFee: 3.00,
    referralFeePercent: 0.15,
    pricing: {
      [MoqLevel.LOW]: { moq: 2000, unitCost: 3.05 },
      [MoqLevel.MED]: { moq: 5000, unitCost: 2.61 },
      [MoqLevel.HIGH]: { moq: 10000, unitCost: 2.28 },
    }
  },
  {
    id: 'optimize',
    name: 'Optimize',
    category: 'Supplements',
    description: '200ml PET jar, 90 Capsules',
    suggestedRetailPrice: 35.99,
    fbaFee: 3.00,
    referralFeePercent: 0.15,
    pricing: {
      [MoqLevel.LOW]: { moq: 2000, unitCost: 5.98 },
      [MoqLevel.MED]: { moq: 5000, unitCost: 5.33 },
      [MoqLevel.HIGH]: { moq: 10000, unitCost: 4.75 },
    }
  },
  {
    id: '5mthf',
    name: '5-MTHF',
    category: 'Supplements',
    description: '100ml PET jar, 30 Capsules',
    suggestedRetailPrice: 23.99,
    fbaFee: 3.00,
    referralFeePercent: 0.15,
    pricing: {
      [MoqLevel.LOW]: { moq: 2000, unitCost: 2.49 },
      [MoqLevel.MED]: { moq: 5000, unitCost: 2.08 },
      [MoqLevel.HIGH]: { moq: 10000, unitCost: 1.78 },
    }
  },
  {
    id: 'd3k2',
    name: 'D3 K2',
    category: 'Supplements',
    description: '100ml PET jar, 30 Capsules',
    suggestedRetailPrice: 17.99,
    fbaFee: 3.00,
    referralFeePercent: 0.15,
    pricing: {
      [MoqLevel.LOW]: { moq: 2000, unitCost: 2.11 },
      [MoqLevel.MED]: { moq: 5000, unitCost: 1.67 },
      [MoqLevel.HIGH]: { moq: 10000, unitCost: 1.41 },
    }
  }
];
