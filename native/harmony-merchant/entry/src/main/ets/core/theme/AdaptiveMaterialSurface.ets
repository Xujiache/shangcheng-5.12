import { uiMaterial } from '@kit.ArkUI';
import { deviceInfo } from '@kit.BasicServicesKit';

export type MaterialThickness = 'thin' | 'regular' | 'thick';

/**
 * Uses HarmonyOS 6.1 immersive material when it is available and keeps an
 * API 21-safe blur/solid fallback. The feature branch is evaluated before an
 * ImmersiveMaterial instance is constructed, so old runtimes never touch the
 * API 26 object.
 */
@Component
export struct AdaptiveMaterialSurface {
  thickness: MaterialThickness = 'regular';
  @Prop materialColor: ResourceColor = '#E6FFFFFF';
  @Prop fallbackColor: ResourceColor = '#F2FFFFFF';
  radius: number = 24;
  interactive: boolean = false;
  @Prop darkMode: boolean = false;

  private supportsImmersiveMaterial(): boolean {
    return deviceInfo.sdkApiVersion >= 26;
  }

  private immersiveStyle(): uiMaterial.ImmersiveStyle {
    if (this.thickness === 'thin') return uiMaterial.ImmersiveStyle.THIN;
    if (this.thickness === 'thick') return uiMaterial.ImmersiveStyle.THICK;
    return uiMaterial.ImmersiveStyle.REGULAR;
  }

  private createMaterial(): uiMaterial.Material {
    return new uiMaterial.ImmersiveMaterial({
      style: this.immersiveStyle(),
      materialColor: this.materialColor,
      colorInvert: this.darkMode,
      applyShadow: true,
      interactive: this.interactive
    });
  }

  build() {
    if (this.supportsImmersiveMaterial()) {
      Stack()
      .width('100%')
      .height('100%')
      .borderRadius(this.radius)
      .clip(true)
      .systemMaterial(this.createMaterial())
      .hitTestBehavior(HitTestMode.None);
    } else {
      Stack()
      .width('100%')
      .height('100%')
      .borderRadius(this.radius)
      .clip(true)
      .backgroundColor(this.fallbackColor)
      .backgroundBlurStyle(BlurStyle.COMPONENT_THICK)
      .hitTestBehavior(HitTestMode.None);
    }
  }
}
