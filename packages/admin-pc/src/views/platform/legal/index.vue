<!--
  平台 PC · 协议管理
  ─────────────────────────────────────────────
  编辑：用户协议 / 隐私政策 / 信息收集清单
  保存后，三端（用户小程序 / 商家 APP / 平台 APP）登录页弹层立即生效（用户端会缓存到内存，下次打开重新拉取）。
-->
<template>
  <div class="pf-legal" v-if="data">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">协议管理</h2>
        <p class="mt-1 text-sm text-g-500">
          维护用户协议、隐私政策、信息收集清单 · 三端登录页 / 设置页弹层均读取此处
        </p>
      </div>
      <div class="flex gap-2">
        <ElButton @click="onPreview">实时预览</ElButton>
        <ElButton type="primary" @click="onSave" :loading="saving">保存全部</ElButton>
      </div>
    </div>

    <ElTabs v-model="active" class="pf-tabs">
      <ElTabPane v-for="k in KINDS" :key="k.key" :label="k.label" :name="k.key">
        <ElCard shadow="never" class="pf-card">
          <ElForm :model="data[k.key]" label-width="120px" label-position="top">
            <ElFormItem label="文档标题">
              <ElInput v-model="data[k.key].title" placeholder="例如：《经纬科技用户服务协议》" />
            </ElFormItem>
            <ElFormItem label="更新时间">
              <ElInput v-model="data[k.key].updatedAt" placeholder="2026-05-13（保存时自动刷新）" />
              <div class="text-xs text-g-500 mt-1"
                >保存时会自动更新为今日日期；如需自定义可手动填写。</div
              >
            </ElFormItem>
            <ElFormItem label="正文内容（Markdown-lite）">
              <ElInput
                v-model="data[k.key].body"
                type="textarea"
                :rows="22"
                :autosize="{ minRows: 22, maxRows: 60 }"
                placeholder="支持 # 一级标题 / ## 二级标题 / ### 三级标题 / - 列表项 / | 表格 | / > 引用"
                class="legal-textarea"
              />
              <div class="text-xs text-g-500 mt-2 leading-relaxed">
                <div>语法说明：</div>
                <div
                  ><code># 一级标题</code> · <code>## 二级标题（带左侧色条）</code> ·
                  <code>### 三级标题</code></div
                >
                <div><code>- 列表项</code> · <code>&gt; 引用块</code></div>
                <div
                  ><code>| 表头 | 表头 |</code> 下一行 <code>| --- | --- |</code> 再下一行
                  <code>| 内容 | 内容 |</code> 即可渲染表格</div
                >
              </div>
            </ElFormItem>
          </ElForm>
        </ElCard>

        <!-- 简单 Markdown 预览 -->
        <ElCard shadow="never" class="pf-card preview-card">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">弹层预览</span>
              <span class="text-xs text-g-500">客户端 / 商家端 / 平台端登录页所见效果</span>
            </div>
          </template>
          <div class="preview-frame">
            <div class="preview-head">
              <span class="preview-title">{{ data[k.key].title }}</span>
            </div>
            <div class="preview-updated" v-if="data[k.key].updatedAt">
              最近更新：{{ data[k.key].updatedAt }}
            </div>
            <div class="preview-body">
              <template v-for="(b, i) in parseBlocks(data[k.key].body)" :key="i">
                <h1 v-if="b.kind === 'h1'">{{ b.text }}</h1>
                <h2 v-else-if="b.kind === 'h2'">{{ b.text }}</h2>
                <h3 v-else-if="b.kind === 'h3'">{{ b.text }}</h3>
                <ul v-else-if="b.kind === 'li'"
                  ><li>{{ b.text }}</li></ul
                >
                <blockquote v-else-if="b.kind === 'quote'">{{ b.text }}</blockquote>
                <table v-else-if="b.kind === 'tableHeader'" class="preview-table">
                  <thead>
                    <tr>
                      <th v-for="(c, k2) in b.cells" :key="k2">{{ c }}</th>
                    </tr>
                  </thead>
                </table>
                <table v-else-if="b.kind === 'tableRow'" class="preview-table">
                  <tbody>
                    <tr>
                      <td v-for="(c, k2) in b.cells" :key="k2">{{ c }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-else-if="b.kind === 'p'">{{ b.text }}</p>
              </template>
            </div>
          </div>
        </ElCard>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    fetchLegalAgreements,
    saveLegalAgreements,
    type LegalAgreements
  } from '@/api/platform-business'

  defineOptions({ name: 'PlatformLegal' })

  type Kind = 'user' | 'privacy' | 'collect'

  const KINDS: { key: Kind; label: string }[] = [
    { key: 'user', label: '用户协议' },
    { key: 'privacy', label: '隐私政策' },
    { key: 'collect', label: '信息收集清单' }
  ]

  const active = ref<Kind>('user')
  const data = ref<LegalAgreements | null>(null)
  const saving = ref(false)

  async function load() {
    try {
      data.value = await fetchLegalAgreements()
    } catch (e: any) {
      ElMessage.error(e?.message || '加载失败')
    }
  }

  async function onSave() {
    if (!data.value) return
    saving.value = true
    try {
      await saveLegalAgreements(data.value)
      ElMessage.success('已保存，三端弹层下次打开即生效')
      // 重新拉取，刷新 updatedAt
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败')
    } finally {
      saving.value = false
    }
  }

  function onPreview() {
    ElMessage.info('滚动至右侧"弹层预览"卡片查看渲染效果；客户端打开时会看到这个底部弹层。')
  }

  interface Block {
    kind: 'h1' | 'h2' | 'h3' | 'li' | 'p' | 'tableRow' | 'tableHeader' | 'quote'
    text: string
    cells?: string[]
  }
  function parseBlocks(body: string): Block[] {
    const lines = (body || '').split(/\r?\n/)
    const out: Block[] = []
    for (const line of lines) {
      const t = line.trim()
      if (!t) {
        continue
      }
      if (t.startsWith('# ')) {
        out.push({ kind: 'h1', text: t.slice(2) })
        continue
      }
      if (t.startsWith('## ')) {
        out.push({ kind: 'h2', text: t.slice(3) })
        continue
      }
      if (t.startsWith('### ')) {
        out.push({ kind: 'h3', text: t.slice(4) })
        continue
      }
      if (t.startsWith('- ')) {
        out.push({ kind: 'li', text: t.slice(2) })
        continue
      }
      if (t.startsWith('> ')) {
        out.push({ kind: 'quote', text: t.slice(2) })
        continue
      }
      if (t.startsWith('|') && t.endsWith('|')) {
        const cells = t
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim())
        const isSep = cells.every((c) => /^:?-+:?$/.test(c))
        if (isSep) {
          for (let i = out.length - 1; i >= 0; i--) {
            if (out[i].kind === 'tableRow') {
              out[i].kind = 'tableHeader'
              break
            }
            if (out[i].kind !== 'tableHeader') break
          }
          continue
        }
        out.push({ kind: 'tableRow', text: t, cells })
        continue
      }
      out.push({ kind: 'p', text: t })
    }
    return out
  }

  onMounted(load)
</script>

<style lang="scss" scoped>
  .pf-legal {
    padding: 16px 0;

    .pf-page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 0 4px 12px;
    }

    .pf-tabs {
      :deep(.el-tabs__nav) {
        font-weight: 600;
      }
    }

    .pf-card {
      margin: 16px 0;
      border-radius: 12px;
    }

    .legal-textarea :deep(.el-textarea__inner) {
      font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;
      font-size: 13px;
      line-height: 1.7;
    }
  }

  /* ===== 弹层预览 ===== */
  .preview-card {
    background: linear-gradient(180deg, #fff8f5 0%, #fff 100%);
    border: 1px solid #ffd9c9;
  }

  .preview-frame {
    max-height: 640px;
    padding: 24px 28px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #f0f2f5;
    border-radius: 16px;
    box-shadow: inset 0 0 0 1px rgb(255 77 45 / 4%);
  }

  .preview-head {
    padding-bottom: 12px;
    margin-bottom: 8px;
    border-bottom: 1px solid #f2f3f5;

    .preview-title {
      font-size: 18px;
      font-weight: 800;
      color: #1d2129;
    }
  }

  .preview-updated {
    margin-bottom: 16px;
    font-size: 12px;
    color: #86909c;
  }

  .preview-body {
    color: #4e5969;

    h1 {
      margin: 16px 0 10px;
      font-size: 22px;
      font-weight: 900;
      color: #1d2129;
    }

    h2 {
      padding-left: 10px;
      margin: 18px 0 8px;
      font-size: 18px;
      font-weight: 800;
      color: #ff4d2d;
      border-left: 4px solid #ff4d2d;
    }

    h3 {
      margin: 14px 0 6px;
      font-size: 15px;
      font-weight: 700;
      color: #1d2129;
    }

    p {
      margin: 8px 0;
      font-size: 14px;
      line-height: 1.85;
    }

    ul {
      padding-left: 0;
      margin: 6px 0;
      list-style: none;

      li {
        position: relative;
        padding-left: 16px;
        font-size: 14px;
        line-height: 1.8;

        &::before {
          position: absolute;
          top: 12px;
          left: 0;
          width: 6px;
          height: 6px;
          content: '';
          background: #ff4d2d;
          border-radius: 50%;
        }
      }
    }

    blockquote {
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 13px;
      line-height: 1.7;
      color: #86909c;
      background: #fff8f5;
      border-left: 4px solid #ff4d2d;
      border-radius: 0 8px 8px 0;
    }

    .preview-table {
      width: 100%;
      margin: 6px 0;
      font-size: 13px;
      border-collapse: collapse;

      th,
      td {
        padding: 8px 10px;
        color: #4e5969;
        text-align: left;
        border-bottom: 1px solid #f2f3f5;
      }

      th {
        font-weight: 700;
        color: #1d2129;
        background: #fafbfc;
      }
    }
  }
</style>
