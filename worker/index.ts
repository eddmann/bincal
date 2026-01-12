import type { Env } from "./types";
import { handleCors, jsonResponse } from "./middleware/cors";
import { handleCalendar } from "./routes/calendar";
import { handleBins, handleLookup, handleCouncils } from "./routes/api";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) {
      return corsResponse;
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // API Routes
      if (path === "/calendar.ics") {
        return handleCalendar(request, env);
      }

      if (path === "/api/bins") {
        return handleBins(request, env);
      }

      if (path === "/api/lookup") {
        return handleLookup(request, env);
      }

      if (path === "/api/councils") {
        return handleCouncils();
      }

      // Health check
      if (path === "/api/health") {
        return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
      }

      // All other routes are handled by the static assets (SPA)
      return new Response("Not Found", { status: 404 });

    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse(
        { error: "Internal server error" },
        500
      );
    }
  },
};
