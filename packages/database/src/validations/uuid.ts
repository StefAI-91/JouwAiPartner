import { z } from "zod";

/**
 * Permissive UUID validator that accepts all UUID formats.
 *
 * Zod 4's built-in .uuid() only accepts RFC 4122 variant-1 UUIDs (version
 * nibble 1-8 and variant nibble 89ab). PostgreSQL/Supabase can produce UUIDs
 * with other variant bits, causing validation failures. This regex matches
 * any 8-4-4-4-12 hex string.
 */
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const zUuid = z.string().regex(UUID_REGEX, "Ongeldig ID");
