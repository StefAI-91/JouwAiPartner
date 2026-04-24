import { getThemeShareDistribution, type WindowAggregation } from "@repo/database/queries/themes";
import { TimeSpentDonut } from "./time-spent-donut";

/**
 * Server wrapper die de share-distribution ophaalt en de client-component
 * de data inbouwt. Zo blijft `TimeSpentDonut` pure-UI + hover-state en
 * leeft de data-fetch in Server-land (CLAUDE.md §Architectuur — "Data
 * ophalen in Server Components").
 *
 * TH-008: accepteert optioneel `preloadedAggregation` zodat pills + donut
 * dezelfde DB-fetch kunnen delen (FIX-TH-804).
 */
export async function TimeSpentDonutSection({
  windowDays = 30,
  preloadedAggregation,
}: {
  windowDays?: number;
  preloadedAggregation?: WindowAggregation;
} = {}) {
  const { slices, totalMentions } = await getThemeShareDistribution({
    windowDays,
    preloaded: preloadedAggregation,
  });
  return <TimeSpentDonut slices={slices} totalMentions={totalMentions} windowDays={windowDays} />;
}
