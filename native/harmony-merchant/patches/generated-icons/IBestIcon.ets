import { IBestIconDataType } from './index.type'
import { getSizeByUnit } from '../../utils/utils'
import { IBestStringNumber } from '../../model/Global.type'

// Merchant adapter: generated bitmap artwork only. Public component API is preserved.
@Component
export struct IBestIcon {
  @Prop @Require name: keyof IBestIconDataType | ResourceStr
  @Prop color: ResourceColor
  @Prop iconSize: IBestStringNumber = 22
  @Prop iconRadius: Length | BorderRadiuses | LocalizedBorderRadiuses = 0
  @Prop fontName: ResourceStr = ''
  @Prop iconAnimation: AnimateParam
  @StorageProp('darkMode') darkMode: boolean = false
  onIconClick: (event: TouchEvent) => void = () => {}

  private source(): ResourceStr {
    if (typeof this.name !== 'string') return this.name
    if (this.name.startsWith('https://') || this.name.startsWith('http://')) return this.name
    const icons = AppStorage.get<Map<string, Resource>>('merchantBitmapIcons')
    return icons?.get(this.name) || ''
  }
  private angle(): number {
    if (this.name === 'arrow-left' || this.name === 'arrow-double-left') return 180
    if (this.name === 'arrow-down') return 90
    if (this.name === 'arrow-up') return -90
    return 0
  }
  build() {
    Image(this.source())
      .width(getSizeByUnit(this.iconSize)).height(getSizeByUnit(this.iconSize))
      .objectFit(ImageFit.Contain).rotate({ angle: this.angle() })
      .backgroundColor(this.darkMode ? '#E8E3D8' : Color.Transparent)
      .borderRadius(this.darkMode ? 4 : getSizeByUnit(this.iconRadius))
      .draggable(false).animation(this.iconAnimation)
      .onTouch(event => { if (event.type === TouchType.Up) this.onIconClick(event) })
  }
}
