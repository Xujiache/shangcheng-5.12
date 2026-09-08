import { common } from '@kit.AbilityKit';
import { UIContext } from '@kit.ArkUI';
import { fileIo as fs, fileUri } from '@kit.CoreFileKit';
import { image } from '@kit.ImageKit';
import { photoAccessHelper } from '@kit.MediaLibraryKit';

export class ImageSaveService {
  static async saveComponent(
    context: common.UIAbilityContext,
    uiContext: UIContext,
    componentId: string,
    title: string
  ): Promise<void> {
    const filePath = `${context.cacheDir}/jingwei_share_${Date.now()}.png`;
    let pixelMap: image.PixelMap | undefined;
    let packer: image.ImagePacker | undefined;
    let file: fs.File | undefined;
    try {
      pixelMap = await uiContext.getComponentSnapshot()
        .get(componentId, { scale: 2, waitUntilRenderFinished: true });
      packer = image.createImagePacker();
      file = fs.openSync(filePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC);
      await packer.packToFile(pixelMap, file.fd, { format: 'image/png', quality: 100 });
      fs.closeSync(file);
      file = undefined;
      const helper = photoAccessHelper.getPhotoAccessHelper(context);
      await helper.showAssetsCreationDialog(
        [fileUri.getUriFromPath(filePath)],
        [{ title, fileNameExtension: 'png', photoType: photoAccessHelper.PhotoType.IMAGE }]
      );
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to save the image');
    } finally {
      if (file) {
        try {
          fs.closeSync(file);
        } catch (_) {
        }
      }
      if (packer) packer.release();
      if (pixelMap) pixelMap.release();
      try {
        fs.unlinkSync(filePath);
      } catch (_) {
        // The temporary file may already have been consumed by the system dialog.
      }
    }
  }
}
