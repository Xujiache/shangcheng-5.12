export interface MerchantUser {
  id: string;
  userId?: string;
  phone?: string;
  nickname: string;
  avatar: string;
  role: string;
  status: string;
  merchantId?: string;
  hasPassword?: boolean;
}

export interface MerchantApplication {
  status: string;
  name: string;
  type: string;
  rejectReason?: string;
}

export interface MerchantLoginSession {
  user: MerchantUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn?: number;
  merchantApplication?: MerchantApplication;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordLoginRequest {
  phone: string;
  password: string;
}

export interface SmsLoginRequest {
  phone: string;
  code: string;
}

export interface SmsCodeRequest {
  phone: string;
  scene: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface PhoneLoginRequest {
  phone: string;
  code: string;
}

export interface MerchantApplyRequest {
  type: string;
  name: string;
  legalName: string;
  creditCode: string;
  legalRep: string;
  contact: string;
  contactPhone: string;
  region: string;
  address: string;
  password?: string;
  businessLicense?: string;
  qualifications?: string[];
  categories?: string[];
}

export interface MerchantApplyResult {
  ok: boolean;
  applyId: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePhoneRequest {
  oldSmsCode?: string;
  newPhone: string;
  newSmsCode: string;
}

export interface ChangePhoneResult {
  ok: boolean;
  phone: string;
}
