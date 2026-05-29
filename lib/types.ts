export interface Product {
  site: string;
  title: string;
  price: number;
  url: string | null;
  currency: "NZD";
}

export interface ScraperResult {
  success: boolean;
  products: Product[];
  error?: string;
}
