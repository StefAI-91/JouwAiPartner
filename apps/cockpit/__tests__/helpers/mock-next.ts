import { vi } from "vitest";

/**
 * Mock `next/cache` so that `revalidatePath` becomes a no-op spy.
 *
 * Usage in test files:
 * ```ts
 * import { getRevalidatePathCalls, revalidatePathMock } from "../helpers/mock-next";
 *
 * vi.mock("next/cache", () => createNextCacheMock());
 *
 * afterEach(() => {
 *   revalidatePathMock.mockClear();
 * });
 * ```
 */

export const revalidatePathMock = vi.fn();
export const revalidateTagMock = vi.fn();

/**
 * Create the vi.mock factory for `next/cache`.
 */
export function createNextCacheMock() {
  return {
    revalidatePath: revalidatePathMock,
    revalidateTag: revalidateTagMock,
    unstable_cache: vi.fn((fn: unknown) => fn),
  };
}

/**
 * Get all paths that were passed to revalidatePath.
 */
export function getRevalidatePathCalls(): string[] {
  return revalidatePathMock.mock.calls.map(
    (call: unknown[]) => call[0] as string,
  );
}

/**
 * Reset all next/cache mocks.
 */
export function resetNextMocks() {
  revalidatePathMock.mockClear();
  revalidateTagMock.mockClear();
}
