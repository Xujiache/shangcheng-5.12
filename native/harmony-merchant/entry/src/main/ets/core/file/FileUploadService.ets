import { http } from '@kit.NetworkKit';
import { photoAccessHelper } from '@kit.MediaLibraryKit';
import { camera, cameraPicker } from '@kit.CameraKit';
import { abilityAccessCtrl, common, Permissions } from '@kit.AbilityKit';
import { AppConfig } from '../config/AppConfig';
import { ApiEnvelope } from '../model/ApiModels';
import { ApiClient, ApiError } from '../network/ApiClient';
import { SessionStore } from '../storage/SessionStore';
import { I18n } from '../i18n/I18n';
import { UploadPolicy } from './UploadPolicy';

export interface UploadedFileResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

interface UploadHeaders {
  'Accept': string;
  'Accept-Language': string;
  'Authorization': string;
  'X-Client-Platform': string;
  'X-Client-Version': string;
}

export class FileUploadService {
  static async chooseImages(maxSelectNumber: number): Promise<string[]> {
    const selectionLimit = UploadPolicy.selectionLimit(maxSelectNumber);
    if (selectionLimit === 0) return [];
    const picker = new photoAccessHelper.PhotoViewPicker();
    const options = new photoAccessHelper.PhotoSelectOptions();
    options.MIMEType = photoAccessHelper.PhotoViewMIMETypes.IMAGE_TYPE;
    options.maxSelectNumber = selectionLimit;
    options.isOriginalSupported = false;
    try {
      const result = await picker.select(options);
      return result.photoUris;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error(I18n.current('无法打开系统相册', 'Unable to open the system gallery'));
    }
  }

  static async uploadImage(uri: string, bizType: string, retry: boolean = true): Promise<string> {
    const normalizedBizType = UploadPolicy.normalizeBizType(bizType);
    const request = http.createHttp();
    const headers: UploadHeaders = {
      'Accept': 'application/json',
      'Accept-Language': AppStorage.get<string>('language') || 'zh-CN',
      'Authorization': `Bearer ${SessionStore.shared().accessToken}`,
      'X-Client-Platform': AppConfig.CLIENT_PLATFORM,
      'X-Client-Version': AppConfig.CLIENT_VERSION
    };
    try {
      const response = await request.request(`${AppConfig.API_BASE_URL}${AppConfig.API_PREFIX}/files/upload`, {
        method: http.RequestMethod.POST,
        header: headers,
        multiFormDataList: [
          { name: 'bizType', contentType: 'text/plain', data: normalizedBizType },
          { name: 'file', contentType: 'image/jpeg', remoteFileName: 'merchant-image.jpg', filePath: uri }
        ],
        expectDataType: http.HttpDataType.STRING,
        connectTimeout: 30000,
        readTimeout: 60000
      });
      if (UploadPolicy.shouldRefresh(response.responseCode, retry)) {
        const accessToken = await ApiClient.refresh();
        if (accessToken) return FileUploadService.uploadImage(uri, normalizedBizType, false);
      }
      let envelope: ApiEnvelope<UploadedFileResult>;
      try {
        envelope = JSON.parse(response.result as string) as ApiEnvelope<UploadedFileResult>;
      } catch (_) {
        throw new ApiError(response.responseCode,
          I18n.current('上传服务返回了无效响应', 'The upload service returned an invalid response'));
      }
      const uploadedUrl = envelope.data?.url || '';
      if (!UploadPolicy.isSuccessful(response.responseCode, envelope.code, uploadedUrl)) {
        throw new ApiError(envelope.code || response.responseCode,
          envelope.message || envelope.msg || I18n.current('上传失败', 'Upload failed'));
      }
      return uploadedUrl;
    } catch (error) {
      if (error instanceof ApiError || error instanceof Error) throw error;
      throw new Error(I18n.current('图片上传失败', 'Image upload failed'));
    } finally {
      request.destroy();
    }
  }

  static async captureImage(context: common.UIAbilityContext): Promise<string> {
    const manager = abilityAccessCtrl.createAtManager();
    const permissions: Permissions[] = ['ohos.permission.CAMERA'];
    try {
      const authorization = await manager.requestPermissionsFromUser(context, permissions);
      if (authorization.authResults.length === 0 || authorization.authResults[0] !== 0) {
        throw new Error(I18n.current('需要相机权限才能拍照', 'Camera permission is required to take photos'));
      }
      const profile = new cameraPicker.PickerProfile();
      profile.cameraPosition = camera.CameraPosition.CAMERA_POSITION_BACK;
      const result = await cameraPicker.pick(context, [cameraPicker.PickerMediaType.PHOTO], profile);
      return result.resultCode === 0 ? result.resultUri : '';
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error(I18n.current('无法打开系统相机', 'Unable to open the system camera'));
    }
  }

  static async captureAndUploadImage(context: common.UIAbilityContext, bizType: string): Promise<string> {
    const uri = await FileUploadService.captureImage(context);
    return uri ? FileUploadService.uploadImage(uri, bizType) : '';
  }

  static async chooseAndUploadImages(maxSelectNumber: number, bizType: string): Promise<string[]> {
    const uris = await FileUploadService.chooseImages(maxSelectNumber);
    const urls: string[] = [];
    for (let index = 0; index < uris.length; index += 1) {
      urls.push(await FileUploadService.uploadImage(uris[index], bizType));
    }
    return urls;
  }
}
