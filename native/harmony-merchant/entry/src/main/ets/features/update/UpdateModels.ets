export interface HarmonyRelease {
  id?: string;
  platform: string;
  version: string;
  versionCode: number;
  url: string;
  storeUrl?: string;
  size: number;
  changelog: string;
  force: boolean;
  publishedAt: string;
}
