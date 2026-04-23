import { redirect } from "next/navigation";

/**
 * TH-011 (FUNC-279) — Tijdelijke redirect. De harness is hernoemd naar
 * `/dev/detector` nu de onderliggende agent de Theme-Detector is. Deze
 * stub blijft één sprint staan (TH-012 verwijdert hem).
 */
export default function LegacyTaggerPage() {
  redirect("/dev/detector");
}
