import type { Env, BinCollection, Address, CouncilFetcher } from "../types";

const TWBC_AUTH_URL = "https://mytwbc.tunbridgewells.gov.uk/authapi/isauthenticated";
const TWBC_API_URL = "https://mytwbc.tunbridgewells.gov.uk/apibroker/runLookup";

interface TwbcAuthResponse {
  "auth-session": string;
}

interface TwbcBinData {
  collectionType: string;
  nextDateUnformatted: string; // DD/MM/YYYY format
}

interface TwbcApiResponse {
  integration: {
    transformed: {
      rows_data: Record<string, TwbcBinData>;
    };
  };
}

// Parse date from DD/MM/YYYY to YYYY-MM-DD
function parseDate(dateStr: string): string {
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

interface SessionData {
  sessionId: string;
  cookies: string;
}

async function getSessionToken(): Promise<SessionData> {
  const uri = "https://mytwbc.tunbridgewells.gov.uk/AchieveForms/?mode=fill&consentMessage=yes&form_uri=sandbox-publish://AF-Process-e01af4d4-eb0f-4cfe-a5ac-c47b63f017ed/AF-Stage-88caf66c-378f-4082-ad1d-07b7a850af38/definition.json&process=1&process_uri=sandbox-processes://AF-Process-e01af4d4-eb0f-4cfe-a5ac-c47b63f017ed&process_id=AF-Process-e01af4d4-eb0f-4cfe-a5ac-c47b63f017ed";

  const params = new URLSearchParams({
    uri,
    hostname: "mytwbc.tunbridgewells.gov.uk",
    withCredentials: "true",
  });

  const response = await fetch(`${TWBC_AUTH_URL}?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });
  if (!response.ok) {
    throw new Error(`TWBC auth failed: ${response.status}`);
  }

  // Extract cookies from Set-Cookie headers
  const cookies = response.headers.getSetCookie?.() || [];
  const cookieString = cookies.map(c => c.split(";")[0]).join("; ");

  const data = await response.json() as TwbcAuthResponse;
  return {
    sessionId: data["auth-session"],
    cookies: cookieString,
  };
}

async function fetchBins(env: Env, postcode: string, uprn: string): Promise<BinCollection[]> {
  const session = await getSessionToken();

  const params = new URLSearchParams({
    id: "6314720683f30",
    repeat_against: "",
    noRetry: "false",
    getOnlyTokens: "undefined",
    log_id: "",
    app_name: "AF-Renderer::Self",
    _: String(Date.now()),
    sid: session.sessionId,
  });

  const response = await fetch(`${TWBC_API_URL}?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": "https://mytwbc.tunbridgewells.gov.uk/fillform/?iframe_id=fillform-frame-1&db_id=",
      "Cookie": session.cookies,
    },
    body: JSON.stringify({
      formValues: {
        Property: {
          siteReference: { value: uprn },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`TWBC API failed: ${response.status}`);
  }

  const data = await response.json() as TwbcApiResponse;
  const rowsData = data?.integration?.transformed?.rows_data;

  if (!rowsData) {
    return [];
  }

  const bins: BinCollection[] = [];
  for (const row of Object.values(rowsData)) {
    if (row.collectionType && row.nextDateUnformatted) {
      const date = parseDate(row.nextDateUnformatted);
      if (date) {
        bins.push({
          type: row.collectionType,
          date,
        });
      }
    }
  }

  return bins;
}

async function lookupAddresses(env: Env, postcode: string): Promise<Address[]> {
  const session = await getSessionToken();

  const params = new URLSearchParams({
    id: "5bd2ca3b8e498",
    repeat_against: "",
    noCache: "true",
    sid: session.sessionId,
  });

  const response = await fetch(`${TWBC_API_URL}?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": session.cookies,
    },
    body: JSON.stringify({
      formValues: {
        Property: {
          searchPostcode: { value: postcode },
        },
      },
    }),
  });

  if (!response.ok) {
    return [];
  }

  interface AddressResponse {
    integration: {
      transformed: {
        rows_data: Record<string, {
          UPRN: string;
          FullAddress: string;
        }>;
      };
    };
  }

  const data = await response.json() as AddressResponse;
  const rowsData = data?.integration?.transformed?.rows_data;

  if (!rowsData) {
    return [];
  }

  const addresses: Address[] = [];
  for (const row of Object.values(rowsData)) {
    if (row.UPRN && row.FullAddress) {
      addresses.push({
        uprn: row.UPRN,
        address: row.FullAddress,
      });
    }
  }

  return addresses;
}

export const tunbridgeWells: CouncilFetcher = {
  id: "tunbridge-wells",
  name: "Tunbridge Wells",
  fetch: fetchBins,
  lookupAddresses,
};
