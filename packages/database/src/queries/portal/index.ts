/**
 * Publieke deur voor het portal-domein (client-portal app). Consumers
 * importeren via `@repo/database/queries/portal` en krijgen alles uit
 * core (issues + projects view voor klant) en access (toegangsregels).
 */

export * from "./core";
export * from "./access";
