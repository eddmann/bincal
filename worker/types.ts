import type { BrowserWorker } from "@cloudflare/puppeteer";

export interface Env {
  BROWSER: BrowserWorker;
  CACHE: KVNamespace;
}

export interface BinCollection {
  type: string;
  date: string; // ISO date string YYYY-MM-DD
}

export interface CouncilFetcher {
  id: string;
  name: string;
  fetch: (env: Env, postcode: string, uprn: string) => Promise<BinCollection[]>;
  lookupAddresses?: (env: Env, postcode: string) => Promise<Address[]>;
}

export interface Address {
  uprn: string;
  address: string;
}

export interface CalendarOptions {
  name: string;
  reminder: string | null; // e.g., "19:00" for 7pm the day before
  group: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
