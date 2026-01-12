import type { Env } from "../types";
import { getCouncil, listCouncils } from "../councils";
import { jsonResponse } from "../middleware/cors";

const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

export async function handleBins(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;

  const councilId = params.get("council");
  const postcode = params.get("postcode");
  const property = params.get("property");

  if (!councilId || !postcode || !property) {
    return jsonResponse(
      { error: "Missing required parameters: council, postcode, property" },
      400
    );
  }

  const council = getCouncil(councilId);
  if (!council) {
    return jsonResponse({ error: `Unknown council: ${councilId}` }, 400);
  }

  try {
    // Check cache
    const cacheKey = `bins:${councilId}:${property}`;
    const cached = await env.CACHE.get(cacheKey, "json");

    if (cached) {
      return jsonResponse({ data: cached, cached: true });
    }

    // Fetch fresh data
    const bins = await council.fetch(env, postcode, property);

    if (bins.length > 0) {
      await env.CACHE.put(cacheKey, JSON.stringify(bins), {
        expirationTtl: CACHE_TTL,
      });
    }

    return jsonResponse({ data: bins, cached: false });

  } catch (error) {
    console.error("Bins API error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Failed to fetch bin data" },
      500
    );
  }
}

export async function handleLookup(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;

  const councilId = params.get("council");
  const postcode = params.get("postcode");

  if (!councilId || !postcode) {
    return jsonResponse(
      { error: "Missing required parameters: council, postcode" },
      400
    );
  }

  const council = getCouncil(councilId);
  if (!council) {
    return jsonResponse({ error: `Unknown council: ${councilId}` }, 400);
  }

  if (!council.lookupAddresses) {
    return jsonResponse(
      { error: "Address lookup not supported for this council" },
      400
    );
  }

  try {
    const addresses = await council.lookupAddresses(env, postcode);
    return jsonResponse({ data: addresses });

  } catch (error) {
    console.error("Lookup API error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Failed to lookup addresses" },
      500
    );
  }
}

export async function handleCouncils(): Promise<Response> {
  return jsonResponse({ data: listCouncils() });
}
