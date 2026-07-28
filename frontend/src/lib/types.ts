export interface Game {
  id: number;
  externalId: number;
  slug: string;
  title: string;
  providerName: string;
  thumbUrl: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  balance: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface SpinResult {
  spinId: string;
  reelResults: string[];
  betAmount: string;
  grossWinnings: string;
  netAmount: string;
  balance: string;
  createdAt: string;
}

export interface SpinHistoryItem {
  spinId: string;
  reelResults: string[];
  betAmount: string;
  grossWinnings: string;
  netAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
}

export interface ClientConfig {
  currencies: string[];
  bet: { min: number; max: number; step: number; options: number[] };
}

export interface ConversionResult {
  coinBalance: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
  convertedBalance: string;
}
