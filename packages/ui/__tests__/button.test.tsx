import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../src/button";

// Q3b §6: Eerste RTL-test in UI-package — verifieert dat de jsdom-setup
// werkt met @base-ui/react Button + variant-classes.

describe("Button", () => {
  it("rendert children-tekst als button-element", () => {
    render(<Button>Klik mij</Button>);
    expect(screen.getByRole("button", { name: "Klik mij" })).toBeInTheDocument();
  });

  it("voegt variant-class toe (destructive variant geeft text-destructive)", () => {
    render(<Button variant="destructive">Verwijder</Button>);
    const btn = screen.getByRole("button", { name: "Verwijder" });
    expect(btn.className).toContain("text-destructive");
  });

  it("propageert custom className mét default klassen", () => {
    render(<Button className="my-custom">Hi</Button>);
    const btn = screen.getByRole("button", { name: "Hi" });
    expect(btn.className).toContain("my-custom");
    expect(btn.className).toContain("inline-flex"); // base class blijft staan
  });

  it("respecteert disabled-attribuut van base-ui", () => {
    render(<Button disabled>Off</Button>);
    expect(screen.getByRole("button", { name: "Off" })).toBeDisabled();
  });
});
