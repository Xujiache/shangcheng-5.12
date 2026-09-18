import { computed, reactive, ref } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>

export interface ThemeStorageAdapter {
  get(key: string): unknown
  set(key: string, value: string): void
  onSystemThemeChange?(listener: (theme: ResolvedThemeMode) => void): () => void
  getSystemTheme?(): ResolvedThemeMode
}

export const APP_THEME_STORAGE_KEY = 'jiujiu_theme_mode'

const LIGHT_THEME_VARS = {
  colorTheme: '#ff4d2d',
  colorSuccess: '#16a56a',
  colorWarning: '#f59e0b',
  colorDanger: '#ef4444',
  colorInfo: '#3b82f6',
  colorTitle: '#171a24',
  colorContent: '#3e4655',
  colorSecondary: '#6f7888',
  colorAid: '#929baa',
  colorTip: '#b6bdc8',
  colorBorder: 'rgba(82, 91, 108, 0.18)',
  colorBorderLight: 'rgba(82, 91, 108, 0.10)',
  colorBg: '#f4f6f9',
  colorIcon: '#778293',
  colorIconActive: '#ff4d2d',
  sizeSidePadding: '16px',
  buttonMediumRadius: '12px',
  buttonLargeRadius: '16px',
  cellGroupInsertRadius: '20px',
  inputBg: 'rgba(255, 255, 255, 0.82)',
  inputRadius: '14px',
  popupRadius: '24px',
  tabsNavLineBgColor: '#ff4d2d',
}

const DARK_THEME_VARS = {
  ...LIGHT_THEME_VARS,
  colorTitle: '#f4f6fb',
  colorContent: '#d7dce5',
  colorSecondary: '#a8b0bd',
  colorAid: '#858e9d',
  colorTip: '#697282',
  colorBorder: 'rgba(225, 231, 240, 0.18)',
  colorBorderLight: 'rgba(225, 231, 240, 0.10)',
  colorBg: '#11141b',
  colorIcon: '#a8b0bd',
  darkBackground: '#0d1016',
  darkBackground2: '#141821',
  darkBackground3: '#191e28',
  darkBackground4: '#202631',
  darkColor: '#f4f6fb',
  darkColor2: '#d7dce5',
  darkColor3: '#a8b0bd',
  darkBorderColor: 'rgba(225, 231, 240, 0.14)',
  inputBg: 'rgba(29, 34, 45, 0.86)',
}

function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function createAppTheme(storage: ThemeStorageAdapter) {
  const storedMode = normalizeThemeMode(storage.get(APP_THEME_STORAGE_KEY))
  const mode = ref<ThemeMode>(storedMode)
  const systemTheme = ref<ResolvedThemeMode>(storage.getSystemTheme?.() ?? 'light')
  const resolvedTheme = computed<ResolvedThemeMode>(() =>
    mode.value === 'system' ? systemTheme.value : mode.value,
  )
  const themeVars = computed<Record<string, string>>(() =>
    resolvedTheme.value === 'dark' ? DARK_THEME_VARS : LIGHT_THEME_VARS,
  )

  function setMode(nextMode: ThemeMode) {
    mode.value = normalizeThemeMode(nextMode)
    storage.set(APP_THEME_STORAGE_KEY, mode.value)
  }

  function refreshSystemTheme() {
    systemTheme.value = storage.getSystemTheme?.() ?? systemTheme.value
  }

  const stopSystemThemeListener =
    storage.onSystemThemeChange?.((nextTheme) => {
      systemTheme.value = nextTheme
    }) ?? (() => {})

  return reactive({
    mode,
    resolvedTheme,
    themeVars,
    setMode,
    refreshSystemTheme,
    stopSystemThemeListener,
  })
}

export type AppThemeController = ReturnType<typeof createAppTheme>

export function createUniAppTheme(options?: { legacyDarkStorageKey?: string }) {
  const uniApi = (globalThis as typeof globalThis & { uni?: any }).uni
  const readSystemTheme = (): ResolvedThemeMode => {
    try {
      return uniApi?.getSystemInfoSync?.()?.theme === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  }

  return createAppTheme({
    get(key) {
      try {
        const stored = uniApi?.getStorageSync?.(key)
        if (stored) return stored
        if (key === APP_THEME_STORAGE_KEY && options?.legacyDarkStorageKey) {
          const legacy = uniApi?.getStorageSync?.(options.legacyDarkStorageKey)
          if (typeof legacy === 'string' && legacy) {
            const parsed = JSON.parse(legacy)
            if (parsed?.darkMode === true) return 'dark'
          }
        }
      } catch {
        return undefined
      }
      return undefined
    },
    set(key, value) {
      try {
        uniApi?.setStorageSync?.(key, value)
      } catch {
        // 隐私模式或存储已满时仅保持本次进程主题，不影响业务启动。
      }
    },
    getSystemTheme: readSystemTheme,
    onSystemThemeChange(listener) {
      const handler = (event: { theme?: string }) => listener(event?.theme === 'dark' ? 'dark' : 'light')
      try {
        uniApi?.onThemeChange?.(handler)
      } catch {
        return () => {}
      }
      return () => {
        try {
          uniApi?.offThemeChange?.(handler)
        } catch {
          // 部分旧 WebView 没有 offThemeChange。
        }
      }
    },
  })
}
