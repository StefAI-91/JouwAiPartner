import { listEmergingThemes } from "@repo/database/queries/themes";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { ThemeApprovalCard } from "./theme-approval-card";

/**
 * UI-290: Sectie "Thema's om te bevestigen" bovenaan `/review`. Rendert niets
 * als er geen emerging themes zijn of als de gebruiker geen admin is — in
 * beide gevallen hoeft er geen review-actie te gebeuren.
 */
export async function EmergingThemesSection() {
  const user = await getAuthenticatedUser();
  if (!user?.id) return null;
  if (!(await isAdmin(user.id))) return null;

  const emerging = await listEmergingThemes();
  if (emerging.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Thema&apos;s om te bevestigen
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          De ThemeTagger stelde {emerging.length} nieuw{emerging.length === 1 ? "" : "e"} thema
          {emerging.length === 1 ? "" : "&apos;s"} voor. Bevestig of wijs af voordat ze op het
          dashboard verschijnen.
        </p>
      </div>
      <div className="space-y-3">
        {emerging.map((theme) => (
          <ThemeApprovalCard key={theme.id} theme={theme} />
        ))}
      </div>
    </section>
  );
}
