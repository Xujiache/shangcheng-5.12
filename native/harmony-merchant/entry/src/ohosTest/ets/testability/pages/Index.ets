@Entry
@Component
struct Index {
  build() {
    Column() {
      Text('经纬商家端原生测试')
        .fontSize(18);
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center);
  }
}
