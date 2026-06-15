import { readFileSync, writeFileSync } from 'node:fs'
function patch(file, edits) {
  let s = readFileSync(file, 'utf8')
  for (const [from, to] of edits) {
    if (!s.includes(from))
      throw new Error('ANCHOR NOT FOUND in ' + file + ':\n----\n' + from + '\n----')
    s = s.replace(from, to)
  }
  writeFileSync(file, s)
  console.log('patched', file)
}
const C = 'packages/ledger-mp/miniprogram/components/lz-bars/'
const H = 'packages/ledger-mp/miniprogram/pages/home/'

// ── 图二：lz-bars 每条显示数字 ──
patch(C + 'index.ts', [
  [
    `import { resolveColor } from '../../utils/icons'

Component({`,
    `import { resolveColor } from '../../utils/icons'

// 条形数字标签：>0 才显示，≥1万用「x.x万」缩写，否则整数
function fmtBarVal(v: number): string {
  if (!(v > 0)) return ''
  if (v >= 10000) return (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '万'
  return String(Math.round(v))
}

Component({`,
  ],
  [
    `    bars: [] as Array<{ idx: number; h: number; h2: number; label: string }>,`,
    `    bars: [] as Array<{ idx: number; h: number; h2: number; label: string; vt: string }>,`,
  ],
  [
    `      const safeMax = max || 1
      const bars = (series || []).map((s, idx) => ({
        idx,
        label: s.label,
        h: Math.max(s.value > 0 ? 2 : 0, ((Number(s.value) || 0) / safeMax) * height),
        h2: grouped
          ? Math.max((s.value2 || 0) > 0 ? 2 : 0, ((Number(s.value2) || 0) / safeMax) * height)
          : 0,
      }))`,
    `      const safeMax = max || 1
      const drawMax = Math.max(20, height - 14) // 顶部留 14px 放数字标签
      const bars = (series || []).map((s, idx) => ({
        idx,
        label: s.label,
        vt: fmtBarVal(Number(s.value) || 0),
        h: Math.max(s.value > 0 ? 2 : 0, ((Number(s.value) || 0) / safeMax) * drawMax),
        h2: grouped
          ? Math.max((s.value2 || 0) > 0 ? 2 : 0, ((Number(s.value2) || 0) / safeMax) * drawMax)
          : 0,
      }))`,
  ],
])
patch(C + 'index.wxml', [
  [
    `      <view class="bars__bar" style="height: {{item.h}}px; background: {{c1}};"></view>`,
    `      <view class="bars__bar" style="height: {{item.h}}px; background: {{c1}};">
        <text wx:if="{{item.vt}}" class="bars__val">{{item.vt}}</text>
      </view>`,
  ],
])
patch(C + 'index.wxss', [
  [
    `.bars__bar {
  width: 62%;
  max-width: 22px;
  border-radius: var(--r-bar) var(--r-bar) 2px 2px;
  transition: height 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}`,
    `.bars__bar {
  position: relative;
  width: 62%;
  max-width: 22px;
  border-radius: var(--r-bar) var(--r-bar) 2px 2px;
  transition: height 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
/* 条顶数字标签 */
.bars__val {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 2px;
  font-size: 9px;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
}`,
  ],
])

// ── 图三：型材优化下料入口移到广告下方 ──
patch(H + 'index.wxml', [
  // 1) 从原位置移除
  [
    `      <!-- 实用工具：型材优化下料（#9）-->
      <view class="lz-card home__tool" hover-class="tap-active" bindtap="toCut">
        <view class="home__tool-icon"><lz-icon name="cube" size="20" color="accent" /></view>
        <view class="lz-flex1">
          <view class="home__tool-t">型材优化下料</view>
          <view class="home__tool-s">一维切割排版 · 省料省成本</view>
        </view>
        <lz-icon name="chevron" size="16" color="faint" />
      </view>

      <!-- 成本占比 -->`,
    `      <!-- 成本占比 -->`,
  ],
  // 2) 插到广告 swiper 之后（常驻，不受加载态影响）
  [
    `      </swiper>

    <!-- 加载失败（网络等）：带重试，不渲染"暂无…"空态 -->`,
    `      </swiper>

    <!-- 实用工具：型材优化下料（#9）：放在广告下方做快捷入口 -->
    <view class="lz-card home__tool" hover-class="tap-active" bindtap="toCut">
      <view class="home__tool-icon"><lz-icon name="cube" size="20" color="accent" /></view>
      <view class="lz-flex1">
        <view class="home__tool-t">型材优化下料</view>
        <view class="home__tool-s">一维切割排版 · 省料省成本</view>
      </view>
      <lz-icon name="chevron" size="16" color="faint" />
    </view>

    <!-- 加载失败（网络等）：带重试，不渲染"暂无…"空态 -->`,
  ],
])

console.log('BARS + HOME PATCH DONE')
