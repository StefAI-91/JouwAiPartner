/**
 * Publieke deur voor het summaries-domein. Alle AI-gegenereerde summaries
 * draaien rond één tabel (`summaries`) met verschillende `summary_type`
 * waarden (context, briefing, weekly, management_insights). Deze deur
 * re-exporteert core + weekly + management-insights sub-files.
 *
 * Fine-grained imports mogelijk via
 *   `@repo/database/queries/summaries/weekly`
 *   `@repo/database/queries/summaries/management-insights`
 */

export * from "./core";
export * from "./weekly";
export * from "./management-insights";
