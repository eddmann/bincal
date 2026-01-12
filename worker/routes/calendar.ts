import type { Env, CalendarOptions, BinCollection } from "../types";
import { getCouncil } from "../councils";
import { generateICal } from "../lib/ical";
import { icalResponse, jsonResponse } from "../middleware/cors";

const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

export async function handleCalendar(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Required parameters
  const councilId = params.get("council");
  const postcode = params.get("postcode");
  const property = params.get("property");

  if (!councilId || !postcode || !property) {
    return jsonResponse(
      { error: "Missing required parameters: council, postcode, property" },
      400
    );
  }

  // Get council fetcher
  const council = getCouncil(councilId);
  if (!council) {
    return jsonResponse({ error: `Unknown council: ${councilId}` }, 400);
  }

  // Optional parameters
  const reminder = params.get("reminder") || "19:00"; // Default: 7pm
  const group = params.get("group") !== "false"; // Default: true
  const name = params.get("name") || "Bin Collections";
  const download = params.has("download");

  const options: CalendarOptions = {
    name,
    reminder: reminder === "" ? null : reminder,
    group,
  };

  try {
    // Check cache first
    const cacheKey = `bins:${councilId}:${property}`;
    let bins: BinCollection[] | null = null;

    const cached = await env.CACHE.get<BinCollection[]>(cacheKey, "json");
    if (cached) {
      bins = cached;
    } else {
      // Fetch from council
      bins = await council.fetch(env, postcode, property);

      // Cache the result
      if (bins.length > 0) {
        await env.CACHE.put(cacheKey, JSON.stringify(bins), {
          expirationTtl: CACHE_TTL,
        });
      }
    }

    if (!bins || bins.length === 0) {
      return jsonResponse(
        { error: "No bin collection data found for this address" },
        404
      );
    }

    // Generate iCal
    const domain = url.hostname;
    const ical = generateICal(bins, options, domain);

    const filename = `${councilId}-bins.ics`;
    return icalResponse(ical, filename, download);

  } catch (error) {
    console.error("Calendar generation error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Failed to fetch bin data" },
      500
    );
  }
}
