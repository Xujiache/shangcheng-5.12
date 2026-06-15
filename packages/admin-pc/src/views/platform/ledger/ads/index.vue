<!--
  平台 PC · 门窗利账 · 首页广告管理（#2）
  ─────────────────────────────────────────────
  对接后端 /api/v1/p/ledger/ads（增删改查）。
  运营在此维护小程序首页的广告轮播图：图片地址、跳转、排序、启停。
-->
<template>
  <div class="pf-ledger">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">首页广告</h2>
        <p class="mt-1 text-sm text-g-500">门窗利账小程序首页轮播 banner · 启用中的按排序展示</p>
      </div>
      <div class="pf-actions">
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
        <ElButton type="primary" :icon="Plus" @click="openCreate">新增广告</ElButton>
      </div>
    </div>

    <ElCard shadow="never">
      <ElTable
        v-loading="loading"
        :data="list"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
        empty-text="暂无广告，点击右上角新增"
      >
        <ElTableColumn label="图片" width="160">
          <template #default="{ row }">
            <ElImage
              v-if="row.image"
              :src="row.image"
              fit="cover"
              class="pf-ad-thumb"
              :preview-src-list="[row.image]"
              preview-teleported
            />
            <span v-else class="text-g-500">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="标题" min-width="160">
          <template #default="{ row }">
            <span>{{ row.title || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="跳转" min-width="200">
          <template #default="{ row }">
            <span v-if="row.link" class="pf-mono">{{ row.link }}</span>
            <span v-else class="text-g-500">无</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="排序" width="90" align="center" prop="sort" />
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElSwitch
              :model-value="row.enabled"
              @change="(v: string | number | boolean) => toggleEnabled(row, Boolean(v))"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="onDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 新增 / 编辑 -->
    <ElDialog
      v-model="dialogOpen"
      :title="editing ? '编辑广告' : '新增广告'"
      width="520px"
      align-center
      destroy-on-close
    >
      <ElForm :model="form" label-position="top">
        <ElFormItem label="AI 生成图片（gpt-image-2）">
          <div class="pf-ai">
            <ElInput
              v-model="ai.prompt"
              type="textarea"
              :rows="2"
              maxlength="2000"
              show-word-limit
              placeholder="描述画面：风格 / 主体 / 配色，并注明留白给文字…"
            />
            <div class="pf-ai-tpls">
              <ElTag
                v-for="(t, i) in AI_TEMPLATES"
                :key="i"
                size="small"
                class="pf-ai-tpl"
                @click="ai.prompt = t"
                >模板{{ i + 1 }}</ElTag
              >
            </div>
            <div class="pf-ai-row">
              <ElSelect v-model="ai.size" size="small" style="width: 150px">
                <ElOption v-for="o in AI_SIZES" :key="o.v" :label="o.l" :value="o.v" />
              </ElSelect>
              <ElSelect v-model="ai.quality" size="small" style="width: 116px">
                <ElOption v-for="o in AI_QUALITY" :key="o.v" :label="o.l" :value="o.v" />
              </ElSelect>
              <ElButton type="primary" :loading="ai.loading" @click="genAi">{{
                ai.loading ? ai.progress || '生成中…' : '生成'
              }}</ElButton>
            </div>
            <div v-if="ai.result" class="pf-ai-result">
              <ElImage
                :src="ai.result"
                fit="cover"
                class="pf-ai-img"
                :preview-src-list="[ai.result]"
              />
              <div class="pf-ai-acts">
                <ElButton size="small" type="success" :loading="ai.adopting" @click="useAi"
                  >用作广告图（转存自有存储）</ElButton
                >
                <ElButton size="small" @click="form.image = ai.result">直接用原图</ElButton>
              </div>
            </div>
          </div>
        </ElFormItem>
        <ElFormItem label="广告图片" required>
          <ElUpload
            :show-file-list="false"
            accept="image/png,image/jpeg,image/gif,image/webp"
            :before-upload="beforeImageUpload"
            :http-request="doImageUpload"
          >
            <div class="pf-ad-uploader" v-loading="imageUploading">
              <ElImage v-if="form.image" :src="form.image" fit="cover" class="pf-ad-uploader-img" />
              <div v-else class="pf-ad-uploader-empty">
                <ElIcon :size="26"><Plus /></ElIcon>
                <span>点击上传图片</span>
              </div>
            </div>
          </ElUpload>
          <div v-if="form.image" class="pf-ad-uploader-tip">
            已上传，点击图片可替换 · 建议尺寸 750×300，≤5MB
          </div>
        </ElFormItem>
        <ElFormItem label="标题（选填）">
          <ElInput
            v-model="form.title"
            maxlength="40"
            show-word-limit
            placeholder="仅后台标识，App 不展示"
          />
        </ElFormItem>
        <ElFormItem label="跳转地址（选填，仅支持站内 /pages/ 路径）">
          <ElInput v-model="form.link" placeholder="如 /pages/membership/index" />
        </ElFormItem>
        <div class="pf-form-row">
          <ElFormItem label="排序（小在前）" class="flex-1">
            <ElInputNumber v-model="form.sort" :min="0" :max="9999" controls-position="right" />
          </ElFormItem>
          <ElFormItem label="启用" class="flex-1">
            <ElSwitch v-model="form.enabled" />
          </ElFormItem>
        </div>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh, Plus } from '@element-plus/icons-vue'
  import {
    fetchLedgerAds,
    createLedgerAd,
    updateLedgerAd,
    deleteLedgerAd,
    uploadLedgerImage,
    generateLedgerAiImage,
    ledgerAiImageStatus,
    adoptLedgerAiImage,
    type LedgerAd
  } from '@/api/ledger'

  defineOptions({ name: 'PlatformLedgerAds' })

  const list = ref<LedgerAd[]>([])
  const loading = ref(false)

  // ====== 图片上传（文件直传 MinIO，非粘贴 URL）======
  const imageUploading = ref(false)
  function beforeImageUpload(file: File) {
    const okType = /^image\/(png|jpe?g|gif|webp)$/.test(file.type)
    if (!okType) {
      ElMessage.warning('请选择 png/jpg/gif/webp 图片')
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      ElMessage.warning('图片大小不能超过 5MB')
      return false
    }
    return true
  }
  async function doImageUpload(opt: { file: File }) {
    imageUploading.value = true
    try {
      const r = await uploadLedgerImage(opt.file)
      if (r?.url) {
        form.image = r.url
        ElMessage.success('图片已上传')
      } else {
        ElMessage.error('上传失败：未返回地址')
      }
    } catch (e: any) {
      ElMessage.error(e?.message || '图片上传失败，请重试')
    } finally {
      imageUploading.value = false
    }
  }

  // ====== AI 生图（#7）======
  const AI_TEMPLATES = [
    '高端断桥铝合金门窗展厅，暖色灯光，现代简约风，右侧大面积留白用于放文字，电商横幅海报',
    '明亮通透的阳光房与落地窗实景，绿植点缀，高级质感，柔和自然光，留白构图',
    '系统门窗金属拉丝细节特写，深色背景打光，质感大片，左侧留白',
    '温馨北欧客厅的大面积窗户，自然采光，柔和色调，简洁留白放标语'
  ]
  const AI_SIZES = [
    { v: '1536x1024', l: '横幅 3:2' },
    { v: '1920x1088', l: '宽横幅 16:9' },
    { v: '1024x1024', l: '方形 1:1' },
    { v: 'auto', l: '自动' }
  ]
  const AI_QUALITY = [
    { v: 'auto', l: '质量·自动' },
    { v: 'high', l: '高' },
    { v: 'medium', l: '中' },
    { v: 'low', l: '低' }
  ]
  const ai = reactive({
    prompt: '',
    size: '1536x1024',
    quality: 'auto',
    loading: false,
    progress: '',
    result: '',
    adopting: false
  })
  let aiTries = 0
  async function genAi() {
    if (!ai.prompt.trim()) {
      ElMessage.warning('请先填写提示词')
      return
    }
    ai.loading = true
    ai.progress = ''
    ai.result = ''
    aiTries = 0
    try {
      const r = await generateLedgerAiImage({
        prompt: ai.prompt.trim(),
        size: ai.size,
        quality: ai.quality
      })
      if (r?.done && r.url) {
        ai.result = r.url
        ai.loading = false
        ElMessage.success('已生成')
      } else if (r?.taskId) {
        pollAi(r.taskId)
      } else {
        ai.loading = false
        ElMessage.error('生成失败：返回异常')
      }
    } catch (e: any) {
      ai.loading = false
      ElMessage.error(e?.message || '生成失败')
    }
  }
  function pollAi(taskId: string) {
    aiTries += 1
    if (aiTries > 40) {
      ai.loading = false
      ElMessage.error('生成超时，请重试')
      return
    }
    setTimeout(async () => {
      try {
        const st = await ledgerAiImageStatus(taskId)
        ai.progress = st.progress || '生成中…'
        if (st.done) {
          ai.loading = false
          if (st.state === 'success' && st.url) {
            ai.result = st.url
            ElMessage.success('已生成')
          } else {
            ElMessage.error(st.error || '生成失败')
          }
        } else {
          pollAi(taskId)
        }
      } catch (e: any) {
        ai.loading = false
        ElMessage.error(e?.message || '查询失败')
      }
    }, 4000)
  }
  async function useAi() {
    if (!ai.result) return
    ai.adopting = true
    try {
      const r = await adoptLedgerAiImage(ai.result)
      if (r?.url) {
        form.image = r.url
        ElMessage.success('已转存并用作广告图')
      } else {
        ElMessage.error('转存失败')
      }
    } catch (e: any) {
      ElMessage.error(e?.message || '转存失败，可改用「直接用原图」')
    } finally {
      ai.adopting = false
    }
  }

  async function load() {
    loading.value = true
    try {
      list.value = await fetchLedgerAds()
    } catch (e: any) {
      ElMessage.error(e?.message || '加载广告列表失败')
    } finally {
      loading.value = false
    }
  }

  // ====== 新增 / 编辑 ======
  const dialogOpen = ref(false)
  const editing = ref(false)
  const editingId = ref('')
  const submitting = ref(false)
  const form = reactive({ image: '', title: '', link: '', sort: 0, enabled: true })

  function resetForm() {
    form.image = ''
    form.title = ''
    form.link = ''
    form.sort = 0
    form.enabled = true
  }

  function openCreate() {
    editing.value = false
    editingId.value = ''
    resetForm()
    dialogOpen.value = true
  }

  function openEdit(row: LedgerAd) {
    editing.value = true
    editingId.value = row.id
    form.image = row.image
    form.title = row.title || ''
    form.link = row.link || ''
    form.sort = row.sort
    form.enabled = row.enabled
    dialogOpen.value = true
  }

  async function submit() {
    if (!form.image.trim()) {
      ElMessage.warning('请填写图片地址')
      return
    }
    submitting.value = true
    try {
      const isEdit = editing.value
      const payload = {
        image: form.image.trim(),
        // 编辑态允许清空：传空串让后端写回 null；新建态空值省略走默认
        title: isEdit ? form.title.trim() : form.title.trim() || undefined,
        link: isEdit ? form.link.trim() : form.link.trim() || undefined,
        sort: form.sort,
        enabled: form.enabled
      }
      if (isEdit) await updateLedgerAd(editingId.value, payload)
      else await createLedgerAd(payload)
      ElMessage.success('已保存')
      dialogOpen.value = false
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  async function toggleEnabled(row: LedgerAd, v: boolean) {
    try {
      await updateLedgerAd(row.id, { enabled: v })
      row.enabled = v
      ElMessage.success(v ? '已启用' : '已停用')
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }

  async function onDelete(row: LedgerAd) {
    try {
      await ElMessageBox.confirm('确定删除这条广告？删除后不可恢复。', '删除广告', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    try {
      await deleteLedgerAd(row.id)
      ElMessage.success('已删除')
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-ledger {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .pf-actions {
    display: flex;
    gap: 10px;
  }

  .text-g-500 {
    color: #6b7280;
  }

  .pf-mono {
    font-family: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  .pf-ad-thumb {
    width: 120px;
    height: 56px;
    background: #f3f4f6;
    border-radius: 6px;
  }

  .pf-ad-uploader {
    width: 320px;
    height: 130px;
    overflow: hidden;
    cursor: pointer;
    border: 1px dashed var(--el-border-color, #d9d9d9);
    border-radius: 8px;
    transition: border-color 0.2s;
  }

  .pf-ad-uploader:hover {
    border-color: var(--el-color-primary, #409eff);
  }

  .pf-ad-uploader-img {
    display: block;
    width: 320px;
    height: 130px;
  }

  .pf-ad-uploader-empty {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 13px;
    color: #9ca3af;
  }

  .pf-ad-uploader-tip {
    margin-top: 6px;
    font-size: 12px;
    color: #9ca3af;
  }

  .pf-form-row {
    display: flex;
    gap: 20px;
  }

  .flex-1 {
    flex: 1;
  }

  .pf-ai {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding: 12px;
    background: #fafbfc;
    border: 1px solid #eef1f4;
    border-radius: 10px;
  }

  .pf-ai-tpls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pf-ai-tpl {
    cursor: pointer;
  }

  .pf-ai-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .pf-ai-result {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pf-ai-img {
    width: 100%;
    max-height: 200px;
    border-radius: 8px;
  }

  .pf-ai-acts {
    display: flex;
    gap: 10px;
  }
</style>
