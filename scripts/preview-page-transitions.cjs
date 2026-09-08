// Isolated browser visual QA from the actual component WXML/WXSS; NOT a WeChat screenshot.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const root = path.resolve('packages/ledger-mp/miniprogram')
const output = path.resolve('docs/页面过渡优化/preview')
const runtime =
  process.env.CODEX_NODE_MODULES ||
  'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
const { chromium } = createRequire(path.join(runtime, 'package.json'))('playwright')

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}
const css = [
  'components/lz-skeleton/index.wxss',
  'components/lz-route-feedback/index.wxss',
  'styles/page-transition.wxss',
]
  .map(read)
  .join('\n')
const templates = {
  skeleton: read('components/lz-skeleton/index.wxml'),
  feedback: read('components/lz-route-feedback/index.wxml'),
}

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面过渡 · 组件样式预览</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f0f5f2;color:#233e33;font-family:"Microsoft YaHei",sans-serif}view,block{display:block}text{display:inline}
    header{padding:28px 20px 22px;background:#f7faf8}h1{margin:0 0 9px;font-size:22px;letter-spacing:.5px}header p{margin:0;font-size:12px;color:#84988c}
    nav{display:flex;gap:5px;margin:18px;background:#e3ebe6;padding:4px;border-radius:28px}button{flex:1;border:0;border-radius:24px;padding:10px 4px;color:#718779;background:transparent;font:inherit;font-size:12px;cursor:pointer}button[aria-pressed=true]{background:#fff;color:#1b4435;font-weight:700}
    main{padding:0 18px 24px}.caption{margin:20px 2px 14px;font-size:12px;color:#728a7c}.hint{padding:18px;color:#8a9b92;font-size:11px;line-height:1.8;text-align:center}
    ${css}
    </style><header><h1>轻柔加载，顺畅切换</h1><p>组件样式预览 · 非微信运行截图</p></header><nav id="variants"></nav><main><p class="caption" id="caption"></p><div id="stage"></div></main><div id="feedback"></div><div class="hint">使用项目中的真实组件模板与样式<br>原生导航、真机帧率及安全区仍需微信环境验收</div><script>
    const templates=${JSON.stringify(templates).replace(/</g, '\\u003c')};
    const names={list:'订单列表',dashboard:'经营概览',detail:'订单详情',form:'编辑表单',inline:'追加加载'};
    const expr=(s,data)=>Function(...Object.keys(data),'return ('+s+');')(...Object.values(data));
    const text=(s,data)=>s.replace(/{{([\\s\\S]*?)}}/g,(_,x)=>String(expr(x,data)??''));
    function nodes(source,data){
      const result=document.createDocumentFragment();let matched=false;
      for(const n of source){
        if(n.nodeType===3){result.append(document.createTextNode(text(n.textContent,data)));continue}
        if(n.nodeType!==1)continue;
        const condition=a=>expr(n.getAttribute(a).replace(/^{{|}}$/g,''),data);
        if(n.hasAttribute('wx:if')){matched=!!condition('wx:if');if(!matched)continue}
        else if(n.hasAttribute('wx:elif')){if(matched)continue;matched=!!condition('wx:elif');if(!matched)continue}
        else if(n.hasAttribute('wx:else')){if(matched)continue;matched=true}
        else matched=false;
        if(n.hasAttribute('wx:for')){
          const values=condition('wx:for');values.forEach((item,index)=>{const clone=n.cloneNode(true);clone.removeAttribute('wx:for');result.append(nodes([clone],{...data,item,index}))});continue
        }
        if(n.tagName==='BLOCK'){result.append(nodes([...n.childNodes],data));continue}
        const target=document.createElement(n.tagName.toLowerCase());
        for(const a of n.attributes)if(!a.name.startsWith('wx:'))target.setAttribute(a.name,text(a.value,data));
        target.append(nodes([...n.childNodes],data));result.append(target);
      }return result;
    }
    function mount(id,source,data){const template=document.createElement('template');template.innerHTML=source;document.getElementById(id).replaceChildren(nodes([...template.content.childNodes],data))}
    window.show=(variant)=>{
      mount('stage',templates.skeleton,{variant,moving:true,label:'正在加载',rows:[0,1,2]});
      document.getElementById('caption').textContent=names[variant]+' · 首次等待时显示，数据就绪立即替换';
      document.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.variant===variant));
    };
    for(const [v,name]of Object.entries(names)){const b=document.createElement('button');b.dataset.variant=v;b.textContent=name;b.onclick=()=>show(v);document.getElementById('variants').append(b)}
    mount('feedback',templates.feedback,{busy:true,slow:false,top:0,moving:true});show('list');
    </script></html>`
  const htmlPath = path.join(output, 'components.html')
  fs.writeFileSync(htmlPath, html)
  const fallback = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromium.executablePath())
      ? {}
      : { executablePath: process.env.PREVIEW_BROWSER || fallback }),
  })
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setContent(html)
    const checks = []
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 880 })
      for (const variant of Object.keys({ list: 1, dashboard: 1, detail: 1, form: 1, inline: 1 })) {
        await page.evaluate((v) => window.show(v), variant)
        assert.equal(await page.locator('.sk').count(), 1)
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `overflow ${variant} ${width}`,
        )
        assert.equal(
          await page.locator('.sk-card').count(),
          variant === 'inline' ? 0 : ['dashboard', 'detail'].includes(variant) ? 4 : 3,
        )
        if (width === 390) {
          // Deterministic mid-shimmer screenshot, not a performance measurement.
          await page.evaluate(() =>
            document.getAnimations().forEach((animation) => {
              animation.pause()
              animation.currentTime = 780
            }),
          )
          await page.screenshot({ path: path.join(output, variant + '-390.png'), fullPage: true })
        }
        checks.push(`${variant} @ ${width}: no horizontal overflow`)
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.evaluate(() => window.show('list'))
    assert.equal(
      await page
        .locator('.sk-card')
        .first()
        .evaluate((el) => getComputedStyle(el, '::after').animationName),
      'none',
    )
    assert.equal(
      await page
        .locator('.route-feedback__light')
        .evaluate((el) => getComputedStyle(el).animationName),
      'none',
    )
    assert.deepEqual(errors, [])
    const result = {
      source: 'actual WXML/WXSS rendered in Chromium, not WeChat',
      checks,
      reducedMotion: 'passed',
      pageErrors: errors,
      nativeVerified: false,
    }
    fs.writeFileSync(path.join(output, 'visual-checks.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
  } finally {
    await browser.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
