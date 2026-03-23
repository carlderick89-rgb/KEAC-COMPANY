export interface User {
  id: string;
  email: string;
  storeName: string;
  plan: number;
  subscriptionStart?: string;
  subscriptionEnd?: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  targetStockLevel: number;
  restockDone?: boolean;
  saleDone?: boolean;
}

export interface Sale {
  id: string;
  userId: string;
  productId: string;
  productName?: string;
  category?: string;
  quantity: number;
  totalPrice: number;
  profit: number;
  saleDate: string;
}

export interface SalesSummary {
  totalSales: number;
  totalProfit: number;
  totalTransactions: number;
}

export interface InventorySummary {
  totalCapital: number;
  totalItems: number;
  lowStockCount: number;
}
