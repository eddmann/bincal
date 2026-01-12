import type { Env, BinCollection, Address, CouncilFetcher } from "../types";

const TMBC_FORM_URL = "https://www.tmbc.gov.uk/xfp/form/167";

// Parse date from "Wed 15 January" format (no year)
function parseDate(dateStr: string): string {
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };

  // Match "Wed 15 January" or "Wednesday 15 January"
  const match = dateStr.match(/(\d{1,2})\s+(\w+)/i);
  if (!match) return "";

  const [, day, month] = match;
  const monthNum = months[month.toLowerCase()];
  if (!monthNum) return "";

  // Determine year - if month is before current month, use next year
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const parsedMonth = parseInt(monthNum, 10);
  const year = parsedMonth < currentMonth ? now.getFullYear() + 1 : now.getFullYear();

  return `${year}-${monthNum}-${day.padStart(2, "0")}`;
}

async function fetchBins(env: Env, postcode: string, uprn: string): Promise<BinCollection[]> {
  // Build multipart form data exactly as the Python script does
  const boundary = "----WebKitFormBoundaryI1XYcX9fNeKxm4LB";
  const body = [
    `------${boundary}`,
    'Content-Disposition: form-data; name="__token"',
    '',
    's_flSv1eIvJDeCwbFaYxclM3UTomdpWgg2cMWzZckaU',
    `------${boundary}`,
    'Content-Disposition: form-data; name="page"',
    '',
    '128',
    `------${boundary}`,
    'Content-Disposition: form-data; name="locale"',
    '',
    'en_GB',
    `------${boundary}`,
    'Content-Disposition: form-data; name="q752eec300b2ffef2757e4536b77b07061842041a_0_0"',
    '',
    postcode,
    `------${boundary}`,
    'Content-Disposition: form-data; name="q752eec300b2ffef2757e4536b77b07061842041a_1_0"',
    '',
    uprn,
    `------${boundary}`,
    'Content-Disposition: form-data; name="next"',
    '',
    'Next',
    `------${boundary}--`,
  ].join('\r\n');

  const response = await fetch(TMBC_FORM_URL, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=----${boundary}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin": "https://www.tmbc.gov.uk",
      "Referer": "https://www.tmbc.gov.uk/xfp/form/167",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`TMBC returned ${response.status}`);
  }

  const html = await response.text();
  const bins: BinCollection[] = [];

  // Parse the HTML table - looking for waste-collections-table
  // Structure: <tr><td>Date</td><td><div class="collections"><p>Bin Type 1</p><p>Bin Type 2</p></div></td></tr>
  const tableMatch = html.match(/<table[^>]*class="[^"]*waste-collections-table[^"]*"[^>]*>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);

  if (tableMatch) {
    const tbody = tableMatch[1];
    const rowMatches = tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

    for (const rowMatch of rowMatches) {
      const row = rowMatch[1];

      // Get date from first td
      const dateMatch = row.match(/<td[^>]*>([^<]+)<\/td>/i);
      if (!dateMatch) continue;

      const dateStr = dateMatch[1].trim();
      const date = parseDate(dateStr);
      if (!date) continue;

      // Get bin types from <p> tags in collections div
      const typeMatches = row.matchAll(/<p[^>]*>([^<]+)<\/p>/gi);
      for (const typeMatch of typeMatches) {
        const binType = typeMatch[1].trim();
        if (binType) {
          bins.push({ type: binType, date });
        }
      }
    }
  }

  return bins;
}

async function lookupAddresses(env: Env, postcode: string): Promise<Address[]> {
  // TMBC uses a different endpoint for address lookup
  // For now, use postcodes.io to get addresses, then user provides UPRN
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { result?: { admin_district?: string } };

  // postcodes.io doesn't provide UPRNs, so we return a placeholder
  // User will need to use FindMyAddress.co.uk to get UPRN
  return [];
}

export const tmbc: CouncilFetcher = {
  id: "tmbc",
  name: "Tonbridge & Malling",
  fetch: fetchBins,
  lookupAddresses,
};
