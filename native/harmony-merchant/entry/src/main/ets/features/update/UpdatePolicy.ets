import { HarmonyRelease } from './UpdateModels';

export class UpdatePolicy {
  static canCheck(inFlight: boolean, force: boolean, now: number, lastCheckedAt: number): boolean {
    if (inFlight) return false;
    return force || now - lastCheckedAt >= 60_000;
  }

  static hasNewVersion(release: HarmonyRelease | null, currentVersionCode: number): boolean {
    return release !== null && Number.isFinite(release.versionCode) &&
      release.versionCode > currentVersionCode;
  }

  static shouldPrompt(
    release: HarmonyRelease | null,
    currentVersionCode: number,
    dismissedVersionCode: number
  ): boolean {
    return UpdatePolicy.hasNewVersion(release, currentVersionCode) &&
      (release?.force === true || release?.versionCode !== dismissedVersionCode);
  }

  static storeUrl(release: HarmonyRelease | null, fallback: string): string {
    const candidate = release?.storeUrl?.trim() || '';
    return /^https:\/\/[^\s]+$/i.test(candidate) ? candidate : fallback;
  }

  static packageSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '--';
    if (bytes < 1024) return `${Math.floor(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
