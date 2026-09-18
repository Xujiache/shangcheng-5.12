import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const androidRoot = join(repoRoot, 'native/android')
const androidAppRoot = join(androidRoot, 'app')
const androidSdkRoot = resolve(
  process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || '/opt/android-sdk',
)
const sdkRoot = resolve(
  process.env.DCLOUD_ANDROID_SDK_ROOT || '/opt/dcloud-offline-sdk/5.24.2026081301',
)
const expectedDcloudVersion = '3.0.0-5020420260813001'
const defaultVersion = { name: '1.0.0', code: 100 }

const apps = {
  merchant: {
    workspace: '@jiujiu/merchant-app',
    packageDir: 'merchant-app',
    appid: '__UNI__B06BCB4',
    applicationId: 'top.ewsn.jingwei.merchant',
    appKeyEnv: 'DCLOUD_APPKEY_MERCHANT',
    gradleTask: ':app:assembleMerchantRelease',
    apkRelative: 'app/build/outputs/apk/merchant/release/app-merchant-release.apk',
    requiredPermissions: [
      'android.permission.INTERNET',
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.REQUEST_INSTALL_PACKAGES',
    ],
  },
  platform: {
    workspace: '@jiujiu/platform-app',
    packageDir: 'platform-app',
    appid: '__UNI__E1F72AD',
    applicationId: 'top.ewsn.jingwei.platform',
    appKeyEnv: 'DCLOUD_APPKEY_PLATFORM',
    gradleTask: ':app:assemblePlatformRelease',
    apkRelative: 'app/build/outputs/apk/platform/release/app-platform-release.apk',
    requiredPermissions: [
      'android.permission.INTERNET',
      'android.permission.CAMERA',
      'android.permission.REQUEST_INSTALL_PACKAGES',
    ],
  },
}

function usage() {
  console.log(`用法：
  pnpm android:release -- --target merchant|platform|all \\
    --version-name 1.0.0 --version-code 100

外部环境：
  DCLOUD_ANDROID_SDK_ROOT   默认 ${sdkRoot}
  DCLOUD_APPKEY_MERCHANT   DCloud 商家端离线 AppKey
  DCLOUD_APPKEY_PLATFORM   DCloud 平台端离线 AppKey
  JIUJIU_ANDROID_SIGNING_DIR 默认 /root/secure/jiujiu-android-signing
  GRADLE_BIN                可选，Gradle 8.14.3 可执行文件
`)
}

function parseArgs(argv) {
  const result = { target: '', versionName: defaultVersion.name, versionCode: defaultVersion.code }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--') continue
    if (arg === '--help' || arg === '-h') return { help: true }
    if (arg === '--target') result.target = argv[++i] || ''
    else if (arg === '--version-name') result.versionName = argv[++i] || ''
    else if (arg === '--version-code') result.versionCode = Number(argv[++i])
    else throw new Error(`未知参数：${arg}`)
  }
  if (!['merchant', 'platform', 'all'].includes(result.target)) {
    throw new Error('--target 必须是 merchant、platform 或 all')
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(result.versionName)) {
    throw new Error('--version-name 必须是 1.0.0 形式的版本号')
  }
  if (!Number.isSafeInteger(result.versionCode) || result.versionCode <= 0) {
    throw new Error('--version-code 必须是正整数')
  }
  return result
}

function run(command, args, options = {}) {
  const display = [command, ...args].join(' ')
  console.log(`\n> ${display}`)
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`命令失败（${result.status}）：${display}`)
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: 'utf8',
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} 执行失败：${result.stderr || result.stdout}`)
  }
  return result.stdout
}

function findFirstDirectory(candidates, description) {
  const found = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isDirectory(),
  )
  if (!found) {
    throw new Error(
      `${description}不存在。已检查：\n${candidates.map((p) => `  - ${p}`).join('\n')}`,
    )
  }
  return found
}

function findGradle() {
  if (process.env.GRADLE_BIN && existsSync(process.env.GRADLE_BIN)) {
    return resolve(process.env.GRADLE_BIN)
  }
  const base = '/root/.gradle/wrapper/dists/gradle-8.14.3-bin'
  if (existsSync(base)) {
    for (const hashDir of readdirSync(base)) {
      const candidate = join(base, hashDir, 'gradle-8.14.3/bin/gradle')
      if (existsSync(candidate)) return candidate
    }
  }
  throw new Error('未找到 Gradle 8.14.3；请设置 GRADLE_BIN')
}

function findAndroidTool(name) {
  const candidate = join(androidSdkRoot, 'build-tools/35.0.0', name)
  if (!existsSync(candidate)) throw new Error(`缺少 Android build-tools 35.0.0：${candidate}`)
  return candidate
}

function readPackageJson(packageDir) {
  return JSON.parse(readFileSync(join(repoRoot, 'packages', packageDir, 'package.json'), 'utf8'))
}

function verifyCompilerVersion(targets) {
  for (const target of targets) {
    const pkg = readPackageJson(apps[target].packageDir)
    for (const dep of [
      '@dcloudio/uni-app',
      '@dcloudio/uni-app-plus',
      '@dcloudio/vite-plugin-uni',
    ]) {
      const actual = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]
      if (actual !== expectedDcloudVersion) {
        throw new Error(
          `${pkg.name} 的 ${dep}=${actual || '缺失'}，必须是 ${expectedDcloudVersion}`,
        )
      }
    }
  }
}

function verifyExternalInputs(targets) {
  if (!existsSync(sdkRoot)) {
    throw new Error(
      `缺少 DCloud 5.24 Android 离线 SDK：${sdkRoot}\n` +
        '请先执行 pnpm android:sdk:install -- /root/最新版.zip',
    )
  }
  for (const requiredDir of ['HBuilder-Integrate-AS', 'SDK']) {
    if (!existsSync(join(sdkRoot, requiredDir))) {
      throw new Error(`DCloud SDK 结构不完整：${join(sdkRoot, requiredDir)}`)
    }
  }
  const markerNames = readdirSync(sdkRoot).filter((name) => /^(source|readme).*\.txt$/i.test(name))
  if (markerNames.length === 0) {
    throw new Error(`DCloud SDK 缺少 SOURCE.txt/Readme.txt 版本标记：${sdkRoot}`)
  }
  const matchingMarker = markerNames.find((name) =>
    /5\.24(?:\D|$)|5020420260813001|2026081301/.test(readFileSync(join(sdkRoot, name), 'utf8')),
  )
  if (!matchingMarker) {
    throw new Error(`DCloud SDK 不是要求的 5.24.2026081301：${markerNames.join(', ')}`)
  }
  const signingDir = resolve(
    process.env.JIUJIU_ANDROID_SIGNING_DIR || '/root/secure/jiujiu-android-signing',
  )
  for (const target of targets) {
    const app = apps[target]
    const appKey = process.env[app.appKeyEnv]?.trim()
    if (!appKey || /^(TODO|REPLACE|MISSING|CONFIGURATION|DUMMY|TEST)/i.test(appKey)) {
      throw new Error(`缺少 ${app.appKeyEnv}（${app.applicationId} 的 DCloud 离线 AppKey）`)
    }
    const propsPath = join(signingDir, `${target}.properties`)
    if (!existsSync(propsPath)) throw new Error(`缺少正式签名配置：${propsPath}`)
  }
}

function stageVendorLibraries() {
  const sampleRoot = join(sdkRoot, 'HBuilder-Integrate-AS/simpleDemo')
  const libsDir = findFirstDirectory(
    [join(sampleRoot, 'libs'), join(sdkRoot, 'SDK/libs')],
    'DCloud 基础运行库目录',
  )
  const vendorRoot = join(androidAppRoot, 'build/vendor-libs')
  rmSync(vendorRoot, { recursive: true, force: true })
  mkdirSync(vendorRoot, { recursive: true })
  for (const file of readdirSync(libsDir)) {
    if (/\.(aar|jar)$/i.test(file) && !file.startsWith('debug-server-release')) {
      copyFileSync(join(libsDir, file), join(vendorRoot, file))
    }
  }
  const sdkLibsDir = join(sdkRoot, 'SDK/libs')
  for (const file of ['install-apk-release.aar']) {
    const source = join(sdkLibsDir, file)
    if (!existsSync(source)) throw new Error(`DCloud SDK 缺少自更新运行库：${source}`)
    copyFileSync(source, join(vendorRoot, file))
  }
  const nativeLibCandidates = [join(sampleRoot, 'src/main/jniLibs'), join(sdkRoot, 'SDK/jniLibs')]
  const nativeLibs = nativeLibCandidates.find((candidate) => existsSync(candidate))
  if (nativeLibs) cpSync(nativeLibs, join(vendorRoot, 'jniLibs'), { recursive: true })
  const requiredLibraries = [
    'lib.5plus.base-release',
    'android-gif-drawable-',
    'uniapp-v8-release',
    'oaid_sdk_',
    'install-apk-release',
    'breakpad-build-release',
  ]
  const stagedNames = readdirSync(vendorRoot)
  const missing = requiredLibraries.filter(
    (prefix) => !stagedNames.some((file) => file.startsWith(prefix)),
  )
  if (missing.length > 0) {
    throw new Error(`DCloud 基础 AAR 不完整：${libsDir}\n缺少：${missing.join(', ')}`)
  }
}

function updateStagedManifest(manifestPath, app, versionName, versionCode) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.id !== app.appid) {
    throw new Error(`编译资源 AppID=${manifest.id}，预期 ${app.appid}`)
  }
  manifest.version = { ...(manifest.version || {}), name: versionName, code: String(versionCode) }
  writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)
}

function stageAppAssets(target, versionName, versionCode) {
  const app = apps[target]
  const compiledRoot = join(repoRoot, 'packages', app.packageDir, 'dist/build/app')
  if (!existsSync(join(compiledRoot, 'manifest.json'))) {
    throw new Error(`${target} 未生成 App 资源：${compiledRoot}`)
  }
  const sampleRoot = join(sdkRoot, 'HBuilder-Integrate-AS/simpleDemo')
  const dataDir = findFirstDirectory(
    [join(sampleRoot, 'src/main/assets/data'), join(sdkRoot, 'SDK/assets/data')],
    'DCloud assets/data 目录',
  )
  const generatedRoot = join(androidAppRoot, 'build/generated-assets', target)
  rmSync(generatedRoot, { recursive: true, force: true })
  mkdirSync(join(generatedRoot, 'apps', app.appid), { recursive: true })
  cpSync(dataDir, join(generatedRoot, 'data'), { recursive: true })
  cpSync(compiledRoot, join(generatedRoot, 'apps', app.appid, 'www'), { recursive: true })
  writeFileSync(
    join(generatedRoot, 'data/dcloud_control.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<hbuilder>\n  <apps>\n    <app appid="${app.appid}" appver="${versionName}" />\n  </apps>\n</hbuilder>\n`,
  )
  updateStagedManifest(
    join(generatedRoot, 'apps', app.appid, 'www/manifest.json'),
    app,
    versionName,
    versionCode,
  )
}

function sha256File(path) {
  const hash = createHash('sha256')
  hash.update(readFileSync(path))
  return hash.digest('hex')
}

function verifyCompiledAppService(target) {
  const app = apps[target]
  const servicePath = join(
    repoRoot,
    'packages',
    app.packageDir,
    'dist/build/app/app-service.js',
  )
  if (!existsSync(servicePath)) throw new Error(`${target} 缺少 app-service.js`)
  const service = readFileSync(servicePath, 'utf8')
  const forbiddenRuntime = [
    ['Faker 测试数据', /\bfaker\b/i],
    ['旧 WebView 不支持的 String.replaceAll', /\.replaceAll\s*\(/],
    ['旧 WebView 不支持的 URLSearchParams', /\bURLSearchParams\b/],
    ['浏览器 DOM createElementNS', /\bcreateElementNS\b/],
    ['浏览器 ResizeObserver', /\bResizeObserver\b/],
    ['不兼容的 LiquidGlass 运行时', /\bLiquidGlass\b/],
  ]
  const found = forbiddenRuntime.filter(([, pattern]) => pattern.test(service)).map(([name]) => name)
  if (found.length > 0) {
    throw new Error(`${target} App 产物包含会导致 Android 白屏的运行时：${found.join('、')}`)
  }
}

function buildTarget(target, versionName, versionCode, gradle, apksigner, aapt) {
  const app = apps[target]
  run('pnpm', ['--filter', app.workspace, 'build:app'])
  verifyCompiledAppService(target)
  stageAppAssets(target, versionName, versionCode)
  run(
    gradle,
    [
      '--no-daemon',
      '--stacktrace',
      app.gradleTask,
      `-PreleaseVersionName=${versionName}`,
      `-PreleaseVersionCode=${versionCode}`,
    ],
    {
      cwd: androidRoot,
      env: {
        ...process.env,
        ANDROID_HOME: androidSdkRoot,
        ANDROID_SDK_ROOT: androidSdkRoot,
      },
    },
  )

  const sourceApk = join(androidRoot, app.apkRelative)
  if (!existsSync(sourceApk)) throw new Error(`Gradle 未生成预期 APK：${sourceApk}`)
  const artifactDir = join(repoRoot, 'artifacts/android')
  mkdirSync(artifactDir, { recursive: true })
  const artifactName = `jingwei-${target}-${versionName}-${versionCode}-release.apk`
  const artifactPath = join(artifactDir, artifactName)
  copyFileSync(sourceApk, artifactPath)

  run(apksigner, ['verify', '--verbose', '--print-certs', artifactPath])
  const badging = capture(aapt, ['dump', 'badging', artifactPath])
  const packageLine = badging.split('\n').find((line) => line.startsWith('package:')) || ''
  if (!packageLine.includes(`name='${app.applicationId}'`)) {
    throw new Error(`${artifactName} 包名校验失败：${packageLine}`)
  }
  if (!packageLine.includes(`versionCode='${versionCode}'`)) {
    throw new Error(`${artifactName} versionCode 校验失败：${packageLine}`)
  }
  if (!packageLine.includes(`versionName='${versionName}'`)) {
    throw new Error(`${artifactName} versionName 校验失败：${packageLine}`)
  }
  if (!badging.includes("sdkVersion:'21'")) {
    throw new Error(`${artifactName} minSdk 必须为 21`)
  }
  if (!badging.includes("targetSdkVersion:'35'")) {
    throw new Error(`${artifactName} targetSdk 必须为 35`)
  }
  for (const permission of app.requiredPermissions) {
    if (!badging.includes(`uses-permission: name='${permission}'`)) {
      throw new Error(`${artifactName} 缺少权限：${permission}`)
    }
  }
  const apkEntries = capture('unzip', ['-Z1', artifactPath])
  for (const abi of ['armeabi-v7a', 'arm64-v8a']) {
    if (!apkEntries.includes(`lib/${abi}/`)) {
      throw new Error(`${artifactName} 缺少 ${abi} 原生库`)
    }
  }

  const certInfo = capture(apksigner, ['verify', '--print-certs', artifactPath])
  const certSha256 =
    certInfo.match(/Signer #1 certificate SHA-256 digest: ([0-9a-f]+)/i)?.[1]?.toLowerCase() || ''
  const artifactSha256 = sha256File(artifactPath)
  writeFileSync(join(artifactDir, `${artifactName}.sha256`), `${artifactSha256}  ${artifactName}\n`)
  return { target, path: artifactPath, artifactSha256, certSha256, packageLine }
}

function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`错误：${error.message}`)
    usage()
    process.exit(2)
  }
  if (args.help) {
    usage()
    return
  }

  const targets = args.target === 'all' ? ['merchant', 'platform'] : [args.target]
  verifyCompilerVersion(targets)
  verifyExternalInputs(targets)
  const gradle = findGradle()
  const apksigner = findAndroidTool('apksigner')
  const aapt = findAndroidTool('aapt')
  stageVendorLibraries()

  const results = targets.map((target) =>
    buildTarget(target, args.versionName, args.versionCode, gradle, apksigner, aapt),
  )
  if (results.length === 2 && results[0].certSha256 === results[1].certSha256) {
    throw new Error('商家端与平台端使用了同一签名证书；正式发布要求两套独立密钥')
  }

  console.log('\n正式 APK 构建完成：')
  for (const result of results) {
    console.log(`- ${result.target}: ${result.path}`)
    console.log(`  APK SHA-256: ${result.artifactSha256}`)
    console.log(`  证书 SHA-256: ${result.certSha256}`)
  }
}

try {
  main()
} catch (error) {
  console.error(`构建失败：${error.message}`)
  process.exit(1)
}
