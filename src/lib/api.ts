const API_BASE = "/api";

export interface Address {
  uprn: string;
  address: string;
}

export interface BinCollection {
  type: string;
  date: string;
}

export interface Council {
  id: string;
  name: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  cached?: boolean;
}

async function fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  return response.json();
}

export async function getCouncils(): Promise<Council[]> {
  const response = await fetchApi<Council[]>("/councils");
  return response.data || [];
}

export async function lookupAddresses(
  council: string,
  postcode: string
): Promise<Address[]> {
  const params = new URLSearchParams({ council, postcode });
  const response = await fetchApi<Address[]>(`/lookup?${params}`);
  return response.data || [];
}

export async function getBins(
  council: string,
  postcode: string,
  property: string
): Promise<BinCollection[]> {
  const params = new URLSearchParams({ council, postcode, property });
  const response = await fetchApi<BinCollection[]>(`/bins?${params}`);
  return response.data || [];
}

export function buildCalendarUrl(params: {
  council: string;
  postcode: string;
  property: string;
  reminder?: string;
  group?: boolean;
  name?: string;
}): string {
  const url = new URL("/calendar.ics", window.location.origin);
  url.searchParams.set("council", params.council);
  url.searchParams.set("postcode", params.postcode);
  url.searchParams.set("property", params.property);

  if (params.reminder) {
    url.searchParams.set("reminder", params.reminder);
  } else {
    url.searchParams.set("reminder", "");
  }

  if (params.group !== undefined) {
    url.searchParams.set("group", String(params.group));
  }

  if (params.name) {
    url.searchParams.set("name", params.name);
  }

  return url.toString();
}

export function buildDownloadUrl(params: {
  council: string;
  postcode: string;
  property: string;
  reminder?: string;
  group?: boolean;
  name?: string;
}): string {
  const url = buildCalendarUrl(params);
  return url + "&download=true";
}
