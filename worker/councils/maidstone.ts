import puppeteer from "@cloudflare/puppeteer";
import type { Env, BinCollection, Address, CouncilFetcher } from "../types";

const MAIDSTONE_URL = "https://my.maidstone.gov.uk/service/Find-your-bin-day";

// Parse date from DD/MM/YYYY to YYYY-MM-DD
function parseDate(dateStr: string): string {
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Wait helper with timeout
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBins(env: Env, postcode: string, paon: string): Promise<BinCollection[]> {
  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();
    await page.goto(MAIDSTONE_URL, { waitUntil: "networkidle0" });

    // Wait for the iframe to load
    await page.waitForSelector('iframe[id="fillform-frame-1"]', { timeout: 30000 });

    // Get the iframe
    const frames = page.frames();
    const frame = frames.find((f) => f.name() === "fillform-frame-1");

    if (!frame) {
      throw new Error("Could not find form iframe");
    }

    // Wait for the postcode input (UKBinCollectionData uses name="postcode")
    await frame.waitForSelector('input[name="postcode"]', { timeout: 60000 });

    // Type the postcode and trigger dropdown
    const postcodeInput = await frame.$('input[name="postcode"]');
    if (!postcodeInput) {
      throw new Error("Could not find postcode input");
    }

    await postcodeInput.type(postcode, { delay: 50 });

    // Wait for autocomplete dropdown to populate
    await delay(5000);

    // Send Tab + Down to open dropdown (matches UKBinCollectionData)
    await postcodeInput.press("Tab");
    await page.keyboard.press("ArrowDown");

    // Wait for dropdown options and click the one matching the PAON
    // UKBinCollectionData uses: //div[contains(text(), ' {user_paon}')]
    // We need to find a div containing the property number/name
    await delay(1000);

    // Find and click the address option containing the PAON
    const addressClicked = await frame.evaluate((paonValue: string) => {
      // Look for dropdown items containing the PAON value
      const allDivs = document.querySelectorAll("div");
      for (const div of allDivs) {
        const text = div.textContent || "";
        // Match PAON with space prefix to avoid partial matches (e.g., "1" matching "10")
        if (text.includes(` ${paonValue}`) || text.startsWith(paonValue + " ") || text.includes(` ${paonValue},`)) {
          (div as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, paon);

    if (!addressClicked) {
      throw new Error(`Could not find address matching property: ${paon}`);
    }

    // Wait for collection panels to load with "Next collection" text
    // UKBinCollectionData waits for this specific text to appear
    await frame.waitForFunction(
      () => {
        const panels = document.querySelectorAll("div.col-collection-panel");
        for (const panel of panels) {
          if (panel.textContent?.includes("Next collection")) {
            return true;
          }
        }
        return false;
      },
      { timeout: 20000 }
    );

    // Extra delay as the page may still be adding data (per UKBinCollectionData comment)
    await delay(5000);

    // Extract bin collection data using exact selectors from UKBinCollectionData
    const bins = await frame.$$eval("div.col-collection-panel", (panels) => {
      const results: { type: string; date: string }[] = [];

      for (const panel of panels) {
        try {
          // Get bin type from h3.collectionDataHeader
          const typeEl = panel.querySelector("h3.collectionDataHeader");
          if (!typeEl) continue;

          const binType = typeEl.textContent?.trim() || "";

          // Get date from ul li containing "Next collection"
          const listItems = panel.querySelectorAll("ul li");
          for (const li of listItems) {
            const text = li.textContent || "";
            if (text.includes("Next collection")) {
              // Extract date after "Next collection" text
              const dateMatch = text.match(/Next collection[:\s]*(\d{2}\/\d{2}\/\d{4})/);
              if (dateMatch && binType) {
                results.push({
                  type: binType,
                  date: dateMatch[1],
                });
              }
            }
          }
        } catch {
          // Skip panels that don't match expected structure
        }
      }

      return results;
    });

    // Convert dates to ISO format
    return bins
      .map((bin) => ({
        type: bin.type,
        date: parseDate(bin.date),
      }))
      .filter((bin) => bin.date);
  } finally {
    await browser.close();
  }
}

async function lookupAddresses(_env: Env, _postcode: string): Promise<Address[]> {
  // Maidstone doesn't have a separate address lookup API
  // Would need to use Browser Rendering to get addresses from the form
  // For now, return empty and rely on user providing PAON
  return [];
}

export const maidstone: CouncilFetcher = {
  id: "maidstone",
  name: "Maidstone",
  fetch: fetchBins,
  lookupAddresses,
};
