import type { CouncilFetcher } from "../types";
import { tunbridgeWells } from "./tunbridge-wells";
import { tmbc } from "./tmbc";
import { maidstone } from "./maidstone";

export const councils: Record<string, CouncilFetcher> = {
  "tunbridge-wells": tunbridgeWells,
  tmbc,
  maidstone,
};

export function getCouncil(id: string): CouncilFetcher | undefined {
  return councils[id];
}

export function listCouncils(): { id: string; name: string }[] {
  return Object.values(councils).map((c) => ({
    id: c.id,
    name: c.name,
  }));
}
