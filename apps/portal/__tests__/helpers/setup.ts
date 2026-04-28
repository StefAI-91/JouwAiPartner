import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL's auto-cleanup hangt af van `globals: true` in vitest, wat hier niet
// gezet is. Zonder expliciete cleanup blijft de DOM van vorige tests staan,
// waardoor `getByRole` in de volgende test op meerdere matches faalt.
afterEach(() => {
  cleanup();
});
