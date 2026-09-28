import { MotionPage } from '../../../utils/page-transition'
import { goToLogin, isLoggedIn, requireLogin } from '../../../utils/store'
import { Acceleration, calibratedReading } from '../../../utils/more-tools/level'
import { reportToolEvent } from '../../../utils/tool-events'

const format = (n: number) => Math.abs(n).toFixed(1)

MotionPage({
  _opened: false,
  _sample: null as Acceleration | null,
  _reference: null as Acceleration | null,
  _handler: null as ((sample: Acceleration) => void) | null,
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
  },
  onShow() {
    const authorized = isLoggedIn()
    this.setData({ authorized })
    if (!authorized) { requireLogin('登录后可免费使用水平仪测量仪。'); return }
    if (!this._opened) { this._opened = true; reportToolEvent('level', 'open') }
    this.startSensor()
  },
  onHide() { this.stopSensor() },
  onUnload() { this.stopSensor() },
  login() { goToLogin() },
  startSensor() {
    if (this._handler) return
    this._handler = (sample: Acceleration) => {
      if (this.data.locked) return
      const prev = this._sample
      const smooth = prev ? {
        x: prev.x * .7 + sample.x * .3,
        y: prev.y * .7 + sample.y * .3,
        z: prev.z * .7 + sample.z * .3,
      } : sample
      this._sample = smooth
      const reading = calibratedReading(smooth, this._reference)
      if (!reading) return
      this.setData({
        unavailable: false,
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
      fail: () => { this.stopSensor(); this.setData({ unavailable: true }) },
    })
  },
  stopSensor() {
    if (this._handler) {
      wx.offAccelerometerChange(this._handler as any)
      this._handler = null
    }
    wx.stopAccelerometer()
  },
  changeMode(event: any) {
    const mode = String(event.currentTarget.dataset.mode)
    if (mode !== 'flat' && mode !== 'incline') return
    this.setData({ mode })
    if (this._sample) {
      const reading = calibratedReading(this._sample, this._reference)
      if (reading) this.setData({ displayAngle: format(mode === 'flat' ? reading.flatDeg : reading.inclineDeg) })
    }
  },
  calibrate() {
    if (this.data.locked || !this._sample) return
    wx.showModal({
      title: '确认校准',
      content: '请先把手机放在已知水平面，校准会将当前位置设为参考零点。',
      success: result => {
        if (!result.confirm || !this._sample) return
        this._reference = { ...this._sample }
        this.setData({ calibrated: true, bubbleX: 0, bubbleY: 0, inclineDeg: 0, displayAngle: '0.0', horizontalText: '0.0', verticalText: '0.0' })
      },
    })
  },
  toggleLock() {
    if (this.data.unavailable || !this._sample) return
    if (!this.data.locked) reportToolEvent('level', 'success')
    this.setData({ locked: !this.data.locked })
  },
})
