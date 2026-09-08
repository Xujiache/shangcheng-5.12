import { IBestSetUIBaseStyle } from '@ibestservices/ibest-ui';
import { DesignTokens } from './DesignTokens';

/** Keeps third-party controls aligned with the app-owned runtime theme. */
export class ComponentThemeBridge {
  static apply(dark: boolean): void {
    try {
      IBestSetUIBaseStyle({
        primary: DesignTokens.brand(dark),
        primaryOpacity: DesignTokens.brandOpacity(dark),
        success: DesignTokens.success(dark),
        danger: DesignTokens.danger(dark),
        borderRadiusSm: `${DesignTokens.RADIUS_SMALL}vp`,
        borderRadiusMd: `${DesignTokens.RADIUS_CONTROL}vp`,
        borderRadiusLg: `${DesignTokens.RADIUS_FIELD}vp`,
        borderRadiusXl: `${DesignTokens.RADIUS_LARGE}vp`,
        borderRadiusMax: `${DesignTokens.RADIUS_PILL}vp`
      });
    } catch (_) {
      // Optional UI-library theming must never block the native app shell.
    }
  }
}
