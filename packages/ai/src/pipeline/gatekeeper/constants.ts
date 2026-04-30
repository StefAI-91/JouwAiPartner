/**
 * Theme-Detector skip-drempel: meetings met een `relevance_score` onder deze
 * waarde worden niet door de Theme-Detector + link-themes flow gehaald
 * (TH-011 FUNC-276, was TH-003 FUNC-211). Zelfde drempel als de
 * email-filter-gatekeeper gebruikt voor ruis-emails.
 */
export const THEME_DETECTOR_MIN_RELEVANCE = 0.4;
