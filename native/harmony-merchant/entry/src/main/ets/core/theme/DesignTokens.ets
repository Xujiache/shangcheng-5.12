export class DesignTokens {
  // BRAND remains the light-mode bootstrap value for third-party components.
  // Owned ArkUI surfaces must use brand(darkMode) instead of reading it directly.
  static readonly BRAND: string = '#8A6A2D';
  static readonly BRAND_DARK: string = '#C5A45B';
  static readonly PAGE_LIGHT: string = '#F6F5F1';
  static readonly PAGE_DARK: string = '#090908';
  static readonly SURFACE_LIGHT: string = '#FAFFFEFB';
  static readonly SURFACE_DARK: string = '#FA1B1B19';
  static readonly TEXT_LIGHT: string = '#1D1C19';
  static readonly TEXT_DARK: string = '#F3F1EA';
  static readonly TEXT_MUTED_LIGHT: string = '#6E6B63';
  static readonly TEXT_MUTED_DARK: string = '#A29E94';
  static readonly BORDER_LIGHT: string = '#FFE5E1D8';
  static readonly BORDER_DARK: string = '#FF2C2B27';
  static readonly SUCCESS_LIGHT: string = '#31795A';
  static readonly SUCCESS_DARK: string = '#6BBF8D';
  static readonly DANGER_LIGHT: string = '#B74649';
  static readonly DANGER_DARK: string = '#E47777';
  static readonly WARNING_LIGHT: string = '#8C641D';
  static readonly WARNING_DARK: string = '#D9A85B';
  // Semantic corner scale. The stepped radii keep controls visually related
  // without turning every surface into the same capsule.
  static readonly RADIUS_SMALL: number = 10;
  static readonly RADIUS_CONTROL: number = 14;
  static readonly RADIUS_FIELD: number = 16;
  static readonly RADIUS_MEDIUM: number = 18;
  static readonly RADIUS_LARGE: number = 22;
  static readonly RADIUS_XL: number = 28;
  static readonly RADIUS_PILL: number = 999;
  static readonly SPACE_XS: number = 4;
  static readonly SPACE_SM: number = 8;
  static readonly SPACE_MD: number = 16;
  static readonly SPACE_LG: number = 24;

  static page(dark: boolean): string { return dark ? DesignTokens.PAGE_DARK : DesignTokens.PAGE_LIGHT; }
  static surface(dark: boolean): string { return dark ? DesignTokens.SURFACE_DARK : DesignTokens.SURFACE_LIGHT; }
  static card(dark: boolean): string { return dark ? '#FF141413' : '#FFFFFEFB'; }
  static elevatedSurface(dark: boolean): string { return dark ? '#FF1B1B19' : '#FFFFFEFB'; }
  static subtle(dark: boolean): string { return dark ? '#FF20201E' : '#FFF0EFEB'; }
  static text(dark: boolean): string { return dark ? DesignTokens.TEXT_DARK : DesignTokens.TEXT_LIGHT; }
  static muted(dark: boolean): string { return dark ? DesignTokens.TEXT_MUTED_DARK : DesignTokens.TEXT_MUTED_LIGHT; }
  static border(dark: boolean): string { return dark ? DesignTokens.BORDER_DARK : DesignTokens.BORDER_LIGHT; }
  static brand(dark: boolean): string { return dark ? DesignTokens.BRAND_DARK : DesignTokens.BRAND; }
  static brandTint(dark: boolean): string { return dark ? '#FF2B2518' : '#FFF1E5C7'; }
  static selectedSurface(dark: boolean): string { return DesignTokens.brandTint(dark); }
  static iconSurface(dark: boolean): string { return dark ? '#FF242422' : '#FFF0EFEB'; }
  static onBrand(dark: boolean): string { return dark ? '#FF17130C' : '#FFFFFFFF'; }
  static success(dark: boolean): string { return dark ? DesignTokens.SUCCESS_DARK : DesignTokens.SUCCESS_LIGHT; }
  static danger(dark: boolean): string { return dark ? DesignTokens.DANGER_DARK : DesignTokens.DANGER_LIGHT; }
  static dangerTint(dark: boolean): string { return dark ? '#FF32191A' : '#FFFCE8E8'; }
  static warning(dark: boolean): string { return dark ? DesignTokens.WARNING_DARK : DesignTokens.WARNING_LIGHT; }
  static warningTint(dark: boolean): string { return dark ? '#FF2C2415' : '#FFFFF3D9'; }
  static brandOpacity(dark: boolean): string { return dark ? '#29C5A45B' : '#248A6A2D'; }
}
