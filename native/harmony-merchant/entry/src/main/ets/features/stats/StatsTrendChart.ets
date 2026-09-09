import { DesignTokens } from '../../core/theme/DesignTokens';
import { I18n } from '../../core/i18n/I18n';
import { AnalyticsTrendPoint } from './StatsModels';
import { StatsPolicy } from './StatsPolicy';

@Component
export struct StatsTrendChart {
  @Prop @Watch('resetPoints') points: AnalyticsTrendPoint[] = [];
  @Prop @Watch('redraw') granularity: string = 'day';
  @StorageLink('language') @Watch('redraw') private language: string = 'zh-CN';
  @StorageLink('darkMode') @Watch('redraw') private darkMode: boolean = false;
  @State private selected: number = 0;
  private context: CanvasRenderingContext2D = new CanvasRenderingContext2D(new RenderingContextSettings(true));
  private canvasWidth: number = 300;
  private canvasHeight: number = 168;
  private left: number = 52;
  private ready: boolean = false;
  aboutToAppear(): void { this.selected = Math.max(0, this.points.length - 1); }
  private resetPoints(): void { this.selected = Math.max(0, this.points.length - 1); this.redraw(); }
  private axis(value: number): string {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}${this.language === 'en-US' ? '×100M' : '亿'}`;
    if (value >= 10000) return `${(value / 10000).toFixed(1)}${this.language === 'en-US' ? '×10k' : '万'}`;
    return value.toFixed(value < 10 ? 2 : 0);
  }
  private x(index: number): number { return this.left + (this.canvasWidth - this.left - 14) * (this.points.length <= 1 ? 0.5 : index / (this.points.length - 1)); }
  private redraw(): void {
    if (!this.ready || this.canvasWidth < 100) return;
    const c = this.context;
    c.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    if (!this.points.length) return;
    const max = Math.max(1, ...this.points.map((point: AnalyticsTrendPoint) => point.amount));
    const top = 12; const bottom = this.canvasHeight - 28; const plot = bottom - top;
    c.font = '12px sans-serif';
    this.left = Math.max(44, Math.min(96, c.measureText(this.axis(max)).width + 10));
    c.lineWidth = 1; c.strokeStyle = this.darkMode ? '#34332E' : '#E5E1D8'; c.fillStyle = DesignTokens.muted(this.darkMode);
    c.textAlign = 'left'; c.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const y = top + plot * i / 2;
      c.fillText(this.axis(max * (1 - i / 2)), 0, y);
      c.beginPath(); c.moveTo(this.left, y); c.lineTo(this.canvasWidth - 14, y); c.stroke();
    }
    c.beginPath(); c.moveTo(this.x(0), bottom);
    this.points.forEach((point: AnalyticsTrendPoint, index: number) => { c.lineTo(this.x(index), bottom - point.amount / max * plot); });
    c.lineTo(this.x(this.points.length - 1), bottom); c.closePath();
    c.fillStyle = DesignTokens.brand(this.darkMode); c.globalAlpha = 0.12; c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.strokeStyle = DesignTokens.brand(this.darkMode); c.lineWidth = 2;
    this.points.forEach((point: AnalyticsTrendPoint, index: number) => {
      const y = bottom - point.amount / max * plot;
      if (index === 0) c.moveTo(this.x(index), y); else c.lineTo(this.x(index), y);
    }); c.stroke();
    const selected = Math.min(this.selected, this.points.length - 1);
    const sx = this.x(selected); const sy = bottom - this.points[selected].amount / max * plot;
    c.globalAlpha = 0.3; c.lineWidth = 1; c.beginPath(); c.moveTo(sx, top); c.lineTo(sx, bottom); c.stroke(); c.globalAlpha = 1;
    c.fillStyle = DesignTokens.brand(this.darkMode); c.beginPath(); c.arc(sx, sy, 4, 0, Math.PI * 2); c.fill();
    const labels = Math.min(this.points.length, this.granularity === 'month' ? 3 : 4);
    c.fillStyle = DesignTokens.muted(this.darkMode); c.textBaseline = 'bottom';
    for (let i = 0; i < labels; i++) {
      const index = labels === 1 ? 0 : Math.round((this.points.length - 1) * i / (labels - 1));
      c.textAlign = i === 0 ? 'left' : i === labels - 1 ? 'right' : 'center';
      c.fillText(StatsPolicy.bucketLabel(this.points[index].bucketStart, this.granularity), this.x(index), this.canvasHeight - 2);
    }
  }
  private selectPoint(x: number): void {
    if (!this.points.length) return;
    this.selected = Math.max(0, Math.min(this.points.length - 1, Math.round((x - this.left) / Math.max(1, this.canvasWidth - this.left - 14) * (this.points.length - 1))));
    this.redraw();
  }
  build() {
    Column({ space: 8 }) {
      Row({ space: 8 }) {
        Text(I18n.text(this.language, '成交趋势', 'Sales trend')).fontSize(16).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
        Text(I18n.text(this.language, '点击查看', 'Tap to inspect')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      }.width('100%');
      if (this.points.length) {
        Row({ space: 8 }) {
          Text(StatsPolicy.bucketLabel(this.points[Math.min(this.selected, this.points.length - 1)].bucketStart, this.granularity, true))
            .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
          Text(StatsPolicy.money(this.points[Math.min(this.selected, this.points.length - 1)].amount)).fontSize(16).fontWeight(FontWeight.Medium)
            .fontColor(DesignTokens.brand(this.darkMode)).textAlign(TextAlign.End).layoutWeight(1);
        }.width('100%');
        Canvas(this.context).width('100%').height(168).onReady(() => { this.ready = true; this.redraw(); })
          .onAreaChange((_: Area, area: Area) => { this.canvasWidth = Number(area.width); this.redraw(); })
          .onClick((event: ClickEvent) => this.selectPoint(event.x));
        if (this.points.every((p: AnalyticsTrendPoint) => p.amount === 0)) Text(I18n.text(this.language, '本期暂无实付成交', 'No paid sales in this period')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      } else Text(I18n.text(this.language, '暂无趋势数据', 'No trend data')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).padding({ top: 30, bottom: 30 });
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16).alignItems(HorizontalAlign.Start);
  }
}
