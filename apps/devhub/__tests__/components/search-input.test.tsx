// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockPush = vi.fn();
let currentUrl = "/issues";

// Mock next/navigation at the module boundary. The hooks read from the
// `currentUrl` closure so we can flip it between pushes to simulate the URL
// actually changing (which is what `router.push` does in production).
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (url: string) => {
      mockPush(url);
      currentUrl = url;
    },
  }),
  useSearchParams: () => {
    const qIndex = currentUrl.indexOf("?");
    return new URLSearchParams(qIndex >= 0 ? currentUrl.slice(qIndex + 1) : "");
  },
  usePathname: () => {
    const qIndex = currentUrl.indexOf("?");
    return qIndex >= 0 ? currentUrl.slice(0, qIndex) : currentUrl;
  },
}));

import { SearchInput } from "../../src/components/layout/search-input";

function typeInto(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

describe("SearchInput", () => {
  beforeEach(() => {
    mockPush.mockReset();
    currentUrl = "/issues";
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("debounces typing: one push per burst, not one per keystroke", () => {
    render(<SearchInput />);
    const input = screen.getByLabelText(/zoek issues/i) as HTMLInputElement;

    typeInto(input, "h");
    typeInto(input, "he");
    typeInto(input, "hel");
    typeInto(input, "hello");
    // Still within debounce window — nothing pushed yet.
    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/issues?q=hello");
  });

  it("keeps later keystrokes when our own push resolves mid-typing (race fix)", () => {
    // This is the specific regression the race-condition fix guards against:
    // while the user is still typing, the URL-sync useEffect must not roll the
    // input back to the value we pushed moments ago.
    render(<SearchInput />);
    const input = screen.getByLabelText(/zoek issues/i) as HTMLInputElement;

    typeInto(input, "hel");
    act(() => {
      vi.advanceTimersByTime(300); // push("hel") fires, URL becomes ?q=hel
    });
    expect(mockPush).toHaveBeenLastCalledWith("/issues?q=hel");

    // User keeps typing while the URL-change effect re-runs.
    typeInto(input, "hello");

    // The input must reflect what the user actually typed, not the stale
    // pushed value. Before the fix, setValue("hel") from the useEffect would
    // clobber "hello" back to "hel".
    expect(input.value).toBe("hello");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(mockPush).toHaveBeenLastCalledWith("/issues?q=hello");
  });

  it("clears ?q when the input is emptied", () => {
    currentUrl = "/issues?q=hello";
    render(<SearchInput />);
    const input = screen.getByLabelText(/zoek issues/i) as HTMLInputElement;
    expect(input.value).toBe("hello");

    typeInto(input, "");
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenLastCalledWith("/issues");
  });

  it("submits immediately on Enter, bypassing the debounce", () => {
    render(<SearchInput />);
    const input = screen.getByLabelText(/zoek issues/i) as HTMLInputElement;

    typeInto(input, "urgent");
    const form = input.closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    // No timer advance — Enter/submit flushes the pending debounce right away.
    expect(mockPush).toHaveBeenCalledWith("/issues?q=urgent");
  });

  it("preserves other URL params on push", () => {
    currentUrl = "/issues?project=abc&status=triage";
    render(<SearchInput />);
    const input = screen.getByLabelText(/zoek issues/i) as HTMLInputElement;

    typeInto(input, "bug");
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Must keep project + status; must add q; must drop page (not present here).
    const pushedUrl = mockPush.mock.calls.at(-1)?.[0] as string;
    expect(pushedUrl).toContain("project=abc");
    expect(pushedUrl).toContain("status=triage");
    expect(pushedUrl).toContain("q=bug");
  });
});
