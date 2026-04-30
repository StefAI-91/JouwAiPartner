import { createClient } from "@repo/database/supabase/server";

const DEFAULT_LOADER_URL = "https://widget.jouw-ai-partner.nl/loader.js";

/**
 * WG-003 — injecteert de JAIP feedback-widget loader op elke cockpit-pagina.
 * Server Component zodat we het ingelogde user-email server-side kunnen
 * meegeven (zonder dat het naar niet-ingelogde requests lekt).
 *
 * Geen project_id env-var? Dan rendert hij niets — handig in lokale dev en
 * preview-deploys waar de widget niet hoeft te draaien.
 */
export async function JaipWidgetScript() {
  const projectId = process.env.NEXT_PUBLIC_JAIP_PLATFORM_PROJECT_ID;
  if (!projectId) return null;

  const loaderUrl = process.env.NEXT_PUBLIC_JAIP_WIDGET_LOADER_URL ?? DEFAULT_LOADER_URL;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email;

  return <script src={loaderUrl} data-project={projectId} data-user-email={userEmail} async />;
}
