import { MotionPage } from '../../../utils/page-transition'
import { goToLogin, isLoggedIn, requireLogin } from '../../../utils/store'
import { Acceleration, calibratedReading } from '../utils/level'
import { reportToolEvent } from '../../../utils/tool-events'
import { toolShare, toolShareTimeline } from '../utils/tool-share'

const format = (n: number) => Math.abs(n).toFixed(1)

MotionPage({
  _opened: false,
  _sample: null as Acceleration | null,
  _reference: null as Acceleration | null,
  _handler: null as ((sample: Acceleration) => void) | null,
  _privacyResolve: null as ((result: any) => void) | null,
  _sensorStarting: false,
  data: {
    authorized: false,
    mode: 'flat',
    unavailable: false,
    calibrated: false,
    locked: false,
    bubbleX: 0,
    bubbleY: 0,
    inclineDeg: 0,
    displayAngle: '0.0',
    horizontalText: '0.0',
    verticalText: '0.0',
    privacyRequired: false,
    sensorMessage: '请允许小程序使用设备运动传感器后重试。',
  },
  onShow() {
    const authorized = isLoggedIn()
    this.setData({ authorized })
    if (!authorized) {
      requireLogin('登录后可免费使用水平仪测量仪。')
      return
    }
    this.bindPrivacyHandler()
    if (!this._opened) {
      this._opened = true
      reportToolEvent('level', 'open')
    }
    this.startSensor()
  },
  onShareAppMessage() {
    return toolShare('level')
  },
  onShareTimeline() {
    return toolShareTimeline('level')
  },
  onHide() {
    this.stopSensor()
    this.unbindPrivacyHandler()
  },
  onUnload() {
    this.stopSensor()
    this.unbindPrivacyHandler()
  },
  login() {
    goToLogin()
  },
  bindPrivacyHandler() {
    const app = getApp<IAppOption>()
    if (!(app == null ? void 0 : app.globalData)) return
    app.globalData.privacyAuthorizationHandler = (resolve, _eventInfo) => {
      this._privacyResolve = resolve
      this.setData({
        unavailable: true,
        privacyRequired: true,
        sensorMessage: '首次使用需要同意微信隐私保护指引，才能读取加速度传感器。',
      })
    }
  },
  unbindPrivacyHandler() {
    const app = getApp<IAppOption>()
    if (app == null ? void 0 : app.globalData) app.globalData.privacyAuthorizationHandler = null
    this._privacyResolve = null
  },
  startSensor() {
    if (this._handler || this._sensorStarting) return
    this._sensorStarting = true
    const privacyApi = wx as any
    const startNativeSensor = () => {
      this._sensorStarting = false
      this._handler = (sample: Acceleration) => {
        if (this.data.locked) return
        const prev = this._sample
        const smooth = prev
          ? {
              x: prev.x * 0.7 + sample.x * 0.3,
              y: prev.y * 0.7 + sample.y * 0.3,
              z: prev.z * 0.7 + sample.z * 0.3,
            }
          : sample
        this._sample = smooth
        const reading = calibratedReading(smooth, this._reference)
        if (!reading) return
        this.setData({
          unavailable: false,
          privacyRequired: false,
          sensorMessage: '',
          bubbleX: Math.round(reading.bubbleX * 65),
          bubbleY: Math.round(reading.bubbleY * 65),
          inclineDeg: reading.inclineDeg,
          displayAngle: format(this.data.mode === 'flat' ? reading.flatDeg : reading.inclineDeg),
          horizontalText: format(reading.horizontalDeg),
          verticalText: format(reading.verticalDeg),
        })
      }
      wx.onAccelerometerChange(this._handler)
      wx.startAccelerometer({
        interval: 'ui',
        fail: (error: any) => {
          this.stopSensor()
          const message = String((error == null ? void 0 : error.errMsg) || '')
          const privacy = /privacy|auth/i.test(message)
          this.setData({
            unavailable: true,
            privacyRequired: privacy,
            sensorMessage: privacy
              ? '首次使用需要同意微信隐私保护指引，才能读取加速度传感器。'
              : '微信没有返回加速度数据，请打开系统“运动与健身”权限后重试。',
          })
        },
      })
    }
    if (typeof privacyApi.getPrivacySetting !== 'function') {
      startNativeSensor()
      return
    }
    privacyApi.getPrivacySetting({
      success: (setting: any) => {
        if (setting && setting.needAuthorization) {
          this._sensorStarting = false
          this.setData({
            unavailable: true,
            privacyRequired: true,
            sensorMessage: '首次使用需要同意微信隐私保护指引，才能读取加速度传感器。',
          })
          return
        }
        startNativeSensor()
      },
      fail: () => startNativeSensor(),
    })
  },
  stopSensor() {
    if (this._handler) {
      wx.offAccelerometerChange(this._handler as any)
      this._handler = null
    }
    wx.stopAccelerometer()
  },
  onPrivacyAgree() {
    const resolve = this._privacyResolve
    this._privacyResolve = null
    this.setData({ privacyRequired: false, unavailable: false, sensorMessage: '' })
    if (resolve) {
      resolve({ buttonId: 'agree-btn', event: 'agree' })
    }
    this.startSensor()
  },
  retrySensor() {
    this.setData({ unavailable: false, sensorMessage: '' })
    this.startSensor()
  },
  changeMode(event: any) {
    const mode = String(event.currentTarget.dataset.mode)
    if (mode !== 'flat' && mode !== 'incline') return
    this.setData({ mode })
    if (this._sample) {
      const reading = calibratedReading(this._sample, this._reference)
      if (reading)
        this.setData({
          displayAngle: format(mode === 'flat' ? reading.flatDeg : reading.inclineDeg),
        })
    }
  },
  calibrate() {
    if (this.data.locked || !this._sample) return
    wx.showModal({
      title: '确认校准',
      content: '请先把手机放在已知水平面，校准会将当前位置设为参考零点。',
      success: (result) => {
        if (!result.confirm || !this._sample) return
        this._reference = { ...this._sample }
        this.setData({
          calibrated: true,
          bubbleX: 0,
          bubbleY: 0,
          inclineDeg: 0,
          displayAngle: '0.0',
          horizontalText: '0.0',
          verticalText: '0.0',
        })
      },
    })
  },
  toggleLock() {
    if (this.data.unavailable || !this._sample) return
    if (!this.data.locked) reportToolEvent('level', 'success')
    this.setData({ locked: !this.data.locked })
  },
})
