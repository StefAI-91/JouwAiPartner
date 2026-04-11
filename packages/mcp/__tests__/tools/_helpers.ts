import { vi } from "vitest";

/**
 * Create a chainable Supabase query mock that resolves with { data, error }.
 * Supports all common PostgREST builder methods.
 */
export function createChainMock(
  resolveWith: { data: unknown; error: unknown } = { data: [], error: null },
) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "eq",
    "neq",
    "ilike",
    "in",
    "or",
    "order",
    "limit",
    "range",
    "gte",
    "lte",
    "insert",
    "update",
    "delete",
    "single",
    "maybeSingle",
  ];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  // Make it thenable so `await query` resolves to { data, error }
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveWith);
  return chain;
}

/**
 * Create a mock Supabase client with configurable per-table and per-rpc results.
 */
export function createMockSupabase(
  config: {
    tables?: Record<string, { data: unknown; error: unknown }>;
    rpcResults?: Record<string, { data: unknown; error: unknown }>;
  } = {},
) {
  return {
    from: vi.fn((table: string) => {
      const result = config.tables?.[table] ?? { data: [], error: null };
      return createChainMock(result);
    }),
    rpc: vi.fn((name: string) => {
      const result = config.rpcResults?.[name] ?? { data: [], error: null };
      return createChainMock(result);
    }),
  };
}

/**
 * Capture tool handlers from a register function.
 * Returns a map of tool name -> handler function.
 * The handler receives (args) and returns { content: [...] }.
 */
export function captureToolHandlers(
  registerFn: (server: unknown) => void,
): Record<
  string,
  (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>
> {
  const handlers: Record<
    string,
    (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>
  > = {};
  const mockServer = {
    tool: vi.fn(
      (
        name: string,
        _desc: string,
        _schema: unknown,
        handler: (
          args: Record<string, unknown>,
        ) => Promise<{ content: { type: string; text: string }[] }>,
      ) => {
        handlers[name] = handler;
      },
    ),
  };
  registerFn(mockServer);
  return handlers;
}

/**
 * Extract text from an MCP tool result.
 */
export function getText(result: { content: { type: string; text: string }[] }): string {
  return result.content[0].text;
}
