import { vi } from "vitest";

export const revalidatePathMock = vi.fn();
export const revalidateTagMock = vi.fn();

export function createNextCacheMock() {
  return {
    revalidatePath: revalidatePathMock,
    revalidateTag: revalidateTagMock,
    unstable_cache: vi.fn((fn: unknown) => fn),
  };
}

export function getRevalidatePathCalls(): string[] {
  return revalidatePathMock.mock.calls.map((call: unknown[]) => call[0] as string);
}

export function resetNextMocks() {
  revalidatePathMock.mockClear();
  revalidateTagMock.mockClear();
}
