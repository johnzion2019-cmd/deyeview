/**
 * Optional Pro capabilities. Every flag stays off.
 * There is no paywall and no upgrade prompt.
 * Removing ads is reserved for a future Pro purchase (`adsEnabled` in src/config/ads.ts).
 * A later release can flip a flag and mount its screen without rearranging the free app.
 */
export const PRO_FEATURES = {
  multiPlant: false,
  cloudBackup: false,
  advancedAlerts: false,
  pdfExport: false,
} as const;

export type ProFeature = keyof typeof PRO_FEATURES;

export function isProEnabled(feature: ProFeature): boolean {
  return PRO_FEATURES[feature];
}
