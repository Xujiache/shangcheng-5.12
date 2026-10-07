import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as glass from '../miniprogram/subpackages/more-tools/utils/glass'

const field = (name: string, value: string, index?: number) => ({
  currentTarget: { dataset: { field: name, index } },
  detail: { value },
})
const picker = (value: number, index?: number) => ({
  currentTarget: { dataset: { index } },
  detail: { value: String(value) },
})
const click = (dataset: Record<string, unknown>) => ({ currentTarget: { dataset } })
const posts: {
  url: string
  input: any
  resolve: (result: any) => void
  reject: (error: Error) => void
}[] = []
const events: unknown[][] = []
let loggedIn = true

function loadPage(name: string) {
  let page: any
  const source = readFileSync(
    new URL(`../miniprogram/subpackages/more-tools/${name}/index.ts`, import.meta.url),
    'utf8',
  )
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(output, {
    exports: {},
    wx: { pageScrollTo() {} },
    require: (id: string) => {
      if (id.endsWith('page-transition'))
        return {
          MotionPage: (definition: any) => {
            page = {
              ...definition,
              data: structuredClone(definition.data),
              setData(values: any) {
                Object.assign(this.data, values)
              },
            }
          },
          navigation: { navigateTo() {} },
        }
      if (id.endsWith('more-tools/glass') || id.endsWith('utils/glass')) return glass
      if (id.endsWith('store'))
        return { isLoggedIn: () => loggedIn, requireLogin() {}, goToLogin() {} }
      if (id.endsWith('tool-events'))
        return { reportToolEvent: (...args: unknown[]) => events.push(args) }
      if (id.endsWith('tool-share'))
        return {
          toolShare: (tool: string) => ({
            title: tool,
            path: `/subpackages/more-tools/${tool}/index`,
            imageUrl: `/assets/share/${tool}.png`,
          }),
        }
      if (id.endsWith('request'))
        return {
          http: {
            post: (url: string, input: any) =>
              new Promise((resolve, reject) => {
                posts.push({ url, input, resolve, reject })
              }),
          },
        }
      throw Error(id)
    },
  })
  page.onShow()
  return page
}
const weightResult = (input: any) => {
  const areaM2 = (input.heightMm / 1000) * (input.widthMm / 1000)
  const totalThicknessMm = input.thicknessesMm.reduce(
    (sum: number, value: number) => sum + value,
    0,
  )
  return {
    weightKg: areaM2 * totalThicknessMm * 2.5,
    areaM2,
    totalThicknessMm,
    weightPerM2: totalThicknessMm * 2.5,
    densityCoefficient: 2.5,
    layerWeightsKg: input.thicknessesMm.map((value: number) => areaM2 * value * 2.5),
  }
}

async function main() {
  const weight = loadPage('glass-weight')
  weight.onField(field('heightMm', '1600'))
  weight.onField(field('widthMm', '3500'))
  let calculation = weight.calculate()
  let request = posts.shift()!
  assert.equal(request.url, '/l/tools/glass/weight')
  assert.deepEqual(request.input, { heightMm: 1600, widthMm: 3500, thicknessesMm: [6, 6] })
  request.resolve(weightResult(request.input))
  await calculation
  assert.equal(weight.data.result.weight, '168')
  assert.equal(weight.data.result.area, '5.6')
  assert.match(weight.data.result.formula, /1\.6 m × 3\.5 m × 6 mm × 2 层 × 2\.5/)

  weight.onField(field('customThicknessMm', '19'))
  weight.chooseThickness(picker(0))
  assert.equal(weight.data.result, null)
  calculation = weight.calculate()
  request = posts.shift()!
  assert.deepEqual(
    request.input.thicknessesMm,
    [19, 19],
    'Custom thickness must override the preset',
  )
  request.resolve(weightResult(request.input))
  await calculation
  assert.equal(weight.data.result.weight, '532')
  weight.onField(field('customThicknessMm', '0'))
  await weight.calculate()
  assert.equal(posts.length, 0, 'An invalid custom value must not fall back to a preset')
  assert.match(weight.data.error, /自定义厚度/)

  weight.reset()
  assert.equal(weight.data.heightMm, '')
  assert.equal(weight.data.widthMm, '')
  assert.equal(weight.data.customThicknessMm, '')
  assert.equal(weight.data.layerCount, 2)
  assert.equal(weight.data.thicknessIndex, 4)
  assert.equal(weight.data.result, null)
  weight.onField(field('heightMm', '1000'))
  weight.onField(field('widthMm', '1000'))
  weight.setCount(3)
  weight.chooseMode(click({ mode: 'mixed' }))
  for (const [index, value] of ['4', '6', '8'].entries())
    weight.onLayerThickness(field('', value, index))
  calculation = weight.calculate()
  request = posts.shift()!
  assert.deepEqual(Array.from(request.input.thicknessesMm), [4, 6, 8])
  request.resolve(weightResult(request.input))
  await calculation
  assert.equal(weight.data.result.weight, '45')
  assert.deepEqual(
    Array.from(weight.data.result.layerWeights, (item: any) => item.weight),
    ['10', '15', '20'],
  )
  weight.chooseMode(click({ mode: 'same' }))
  weight.chooseMode(click({ mode: 'mixed' }))
  assert.deepEqual(
    Array.from(weight.data.layers, (item: any) => item.thicknessMm),
    ['4', '6', '8'],
    'Switching modes must preserve the per-layer draft',
  )

  calculation = weight.calculate()
  request = posts.shift()!
  weight.onField(field('widthMm', '2000'))
  request.resolve(weightResult(request.input))
  await calculation
  assert.equal(weight.data.result, null, 'An earlier response must not replace edited parameters')
  assert.equal(weight.data.calculating, false)
  calculation = weight.calculate()
  const stale = posts.shift()!
  weight.reset()
  weight.onField(field('heightMm', '1'))
  weight.onField(field('widthMm', '1'))
  const newer = weight.calculate()
  request = posts.shift()!
  stale.resolve(weightResult(stale.input))
  await calculation
  assert.equal(
    weight.data.calculating,
    true,
    'An old finally must not stop the current loading state',
  )
  request.resolve(weightResult(request.input))
  await newer
  assert(
    Number(weight.data.result.weight) > 0,
    'A small positive mass must not be displayed as zero',
  )
  calculation = weight.calculate()
  request = posts.shift()!
  weight.onUnload()
  request.resolve(weightResult(request.input))
  await calculation
  assert.equal(posts.length, 0)

  const k = loadPage('glass')
  k.onPaneField(field('thicknessMm', '4', 0))
  k.setCount(4)
  assert.equal(k.data.panes[0].thicknessMm, '4', 'Adding layers must retain existing values')
  assert.equal(k.data.gaps.length, 3)
  k.chooseGapType(picker(1, 1))
  k.chooseGas(picker(1, 2))
  k.chooseCoating(picker(3, 2))
  k.onPaneField(field('frontEmissivity', '.04', 2))
  k.onPaneField(field('backEmissivity', '.18', 2))
  calculation = k.calculate()
  request = posts.shift()!
  assert.equal(request.url, '/l/tools/glass/estimate')
  assert.equal(request.input.panes.length, 4)
  assert.equal(request.input.gaps.length, 3)
  assert.equal(request.input.gaps[1].type, 'vacuum')
  assert.equal(request.input.gaps[1].vacuumPressurePa, 0.1)
  assert.equal(request.input.gaps[2].gas, 'argon')
  assert.equal(request.input.panes[2].frontEmissivity, 0.04)
  assert.equal(request.input.panes[2].backEmissivity, 0.18)
  request.resolve({
    uValue: 0.765,
    unit: 'W/(m²·K)',
    region: 'center-of-glazing',
    model: 'test engine',
  })
  await calculation
  assert.equal(k.data.result.value, '0.77')
  assert.equal(k.data.panes.length, 4, 'The editor must remain available after a result')
  k.setCount(20)
  assert.equal(k.data.gaps.length, 19)
  k.setCount(21)
  assert.equal(k.data.panes.length, 20)
  const max = glass.buildGlassEstimate(k.data.panes, k.data.gaps, '25', '7.7')
  assert.equal(max.panes.length, 20)
  k.onGapField(field('thicknessMm', '3', 0))
  await k.calculate()
  assert.match(k.data.error, /第 1 腔厚度/)
  assert.equal(posts.length, 0)
  k.reset()
  assert.equal(k.data.panes.length, 2)
  assert.equal(k.data.gaps.length, 1)
  calculation = k.calculate()
  request = posts.shift()!
  request.reject(Error('服务器忙'))
  await calculation
  assert.equal(k.data.error, '服务器忙')
  assert.equal(k.data.calculating, false)

  for (let layerCount = 1; layerCount <= 20; layerCount++) {
    assert.equal(
      glass.buildGlassWeight({
        heightMm: '1600',
        widthMm: '3500',
        thicknessIndex: 4,
        customThicknessMm: '',
        mixed: false,
        layers: [],
        layerCount,
      }).thicknessesMm.length,
      layerCount,
    )
  }
  assert.throws(
    () => glass.buildGlassEstimate([glass.newGlassPane(0), glass.newGlassPane(1)], [], '25', '7.7'),
    /不匹配/,
  )
  loggedIn = false
  const guest = loadPage('glass-weight')
  await guest.calculate()
  assert.equal(guest.data.authorized, false)
  assert.equal(posts.length, 0)
  assert(events.some((event) => event[0] === 'glass-weight' && event[1] === 'open'))
  console.log(
    'glass tools verified: screenshot, custom priority, mixed panes, layer bounds, coatings, validation, reset, login and stale responses',
  )
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
