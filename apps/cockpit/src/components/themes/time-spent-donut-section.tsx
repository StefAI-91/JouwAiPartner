import { getThemeShareDistribution } from "@repo/database/queries/themes";
import { TimeSpentDonut } from "./time-spent-donut";

/**
 * Server wrapper die de share-distribution ophaalt en de client-component
 * de data inbouwt. Zo blijft `TimeSpentDonut` pure-UI + hover-state en
 * leeft de data-fetch in Server-land (CLAUDE.md §Architectuur — "Data
 * ophalen in Server Components").
 */
export async function TimeSpentDonutSection({ windowDays = 30 }: { windowDays?: number } = {}) {
  const { slices, totalMentions } = await getThemeShareDistribution({ windowDays });
  return <TimeSpentDonut slices={slices} totalMentions={totalMentions} windowDays={windowDays} />;
}
