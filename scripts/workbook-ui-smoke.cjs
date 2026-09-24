const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  cp = require('node:child_process')
const automator = require('../packages/ledger-mp/node_modules/miniprogram-automator')
async function main() {
  const testRoot = path.resolve('packages/server/.workbook-test/ui-' + Date.now())
  fs.mkdirSync(testRoot, { recursive: true })
  fs.cpSync('packages/ledger-mp/miniprogram', path.join(testRoot, 'miniprogram'), {
    recursive: true,
  })
  const config = JSON.parse(fs.readFileSync('packages/ledger-mp/project.config.json', 'utf8'))
  config.appid = 'touristappid'
  config.projectname = 'workbook-acceptance'
  config.setting.urlCheck = false
  fs.writeFileSync(path.join(testRoot, 'project.config.json'), JSON.stringify(config, null, 2))
  const out = path.resolve('docs/记工系统/assets')
  fs.mkdirSync(out, { recursive: true })
  // The copy has a separate tourist identity; never clears the user's real mini-program storage.
  const cli = 'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat'
  const port = 9427
  // Windows Node 24 cannot directly spawn .bat: launch the documented CLI, then connect.
  const launch = cp.spawn(
    'cmd.exe',
    [
      '/d',
      '/s',
      '/c',
      '""' + cli + '" auto --project "' + testRoot + '" --auto-port ' + port + ' --trust-project"',
    ],
    { stdio: 'ignore', windowsHide: true },
  )
  let mini
  for (let i = 0; i < 50; i++) {
    try {
      mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:' + port })
      break
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  if (!mini)
    throw Error(
      'Developer Tools automation unavailable (login/service-port confirmation may be required). Test copy: ' +
        testRoot,
    )
  const errors = []
  mini.on('exception', (e) => errors.push(e))
  try {
    const home = await mini.reLaunch('/pages/home/index')
    await home.waitFor(1500)
    assert.equal(await home.data('loggedIn'), false)
    await mini.screenshot({ path: path.join(out, 'home-guest.png') })
    let page = await mini.reLaunch('/pages/work-log/index')
    await page.waitFor(500)
    assert.equal(await page.data('workerCount'), 0)
    page = await mini.navigateTo('/subpackages/workbook/people/index')
    await page.callMethod('add')
    await page.setData({
      'form.name': '测试安装师傅',
      'form.jobType': '安装',
      'form.rate': '300.25',
    })
    await page.callMethod('save')
    await page.waitFor(300)
    assert.equal((await page.data('list')).length, 1)
    await mini.screenshot({ path: path.join(out, 'workbook-people.png') })
    const worker = (await page.data('list'))[0]
    page = await mini.navigateTo('/subpackages/workbook/edit/index')
    await page.callMethod('chooseWorkers', { detail: { value: [worker.id] } })
    await page.setData({ 'form.quantity': '0.5' })
    await page.callMethod('preview')
    assert.equal(await page.data('amount'), '¥150.13')
    await mini.screenshot({ path: path.join(out, 'workbook-entry.png') })
    await page.callMethod('save')
    await page.waitFor(300)
    page = await mini.reLaunch('/pages/work-log/index')
    await page.waitFor(500)
    assert.equal(await page.data('earned'), '¥150.13')
    await mini.screenshot({ path: path.join(out, 'workbook-overview.png') })
    page = await mini.navigateTo('/subpackages/workbook/records/index')
    await page.waitFor(300)
    assert.equal(await page.data('count'), 1)
    await mini.screenshot({ path: path.join(out, 'workbook-calendar.png') })
    page = await mini.reLaunch('/subpackages/workbook/reports/index')
    await page.waitFor(300)
    await page.callMethod('export', { currentTarget: { dataset: { type: 'pdf' } } })
    await page.waitFor(1000)
    assert((await page.data('outputPath')).endsWith('.pdf'))
    await mini.screenshot({ path: path.join(out, 'workbook-reports.png') })
    fs.writeFileSync(
      path.resolve('docs/记工系统/UI-ACCEPTANCE.json'),
      JSON.stringify({ testRoot, passed: true, errors }, null, 2),
    )
    assert.equal(errors.length, 0)
  } finally {
    await mini.close()
  }
}
main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
