/**
 * Publieke deur voor het portal-domein (client-portal app). Consumers
 * importeren via `@repo/database/queries/portal` en krijgen alles uit
 * core (issues + projects view voor klant), access (toegangsregels) en
 * meetings (klant-segmenten — alleen `party_type === 'client'`).
 */

export * from "./core";
export * from "./access";
export * from "./meetings";
export * from "./briefing";
