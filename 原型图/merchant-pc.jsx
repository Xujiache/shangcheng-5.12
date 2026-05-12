// Merchant PC backend - desktop screens

const MA_PC_SIDE = {
  brand: "商家管理 PC",
  menu: [
    { label: "🏠 首页" },
    { label: "📊 数据统计" },
    { label: "📦 商品" },
    { label: "  · 商品列表", sub: true },
    { label: "  · 添加商品", sub: true },
    { label: "  · 分类管理", sub: true },
    { label: "  · 产品扩展(代理)", sub: true },
    { label: "🧾 订单" },
    { label: "👥 客户管理" },
    { label: "🏪 门店管理" },
    { label: "👨 员工管理" },
    { label: "🎨 店铺装修" },
    { label: "📣 营销中心" },
    { label: "💬 客服中心" },
    { label: "⚙️ 我的 / 设置" },
  ],
};

function MAPC_Home() {
  return (
    <PCWindow idx="01" title="商家PC · 首页 / 数据看板" url="merchant.99shop.com/dashboard" side={MA_PC_SIDE} active={0}>
      <PCTopbar crumbs="首页" title="今日概览" actions={<><Btn>导出</Btn><Btn tone="dark">📅 今日 ⌄</Btn></>} />
      <div className="grid4" style={{gap:10}}>
        {[
          ["今日订单","28","+12%"],
          ["今日销售额","¥18,920","+8%"],
          ["新客户","12","+3"],
          ["待处理","5","紧急"],
        ].map(([t,v,d])=>(
          <Box key={t} className="dashed flat">
            <div className="tiny muted">{t}</div>
            <div style={{fontSize:22,fontWeight:700, color:"var(--accent)"}}>{v}</div>
            <div className="tiny" style={{color:"var(--accent-2)"}}>{d}</div>
          </Box>
        ))}
      </div>
      <div style={{height:12}}></div>
      <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:12}}>
        <Box>
          <div className="row between"><b style={{fontSize:13}}>本周销售趋势</b>
            <div className="row" style={{gap:4}}>
              <Tag tone="accent">销售额</Tag><Tag>订单数</Tag><Tag>客单价</Tag>
            </div>
          </div>
          <div className="chart-line" style={{height:140, marginTop:6}}>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none">
              <polyline points="0,32 14,28 28,30 42,18 56,22 70,12 84,18 100,9" fill="none" stroke="var(--accent)" strokeWidth="1.2"/>
              <polyline points="0,36 14,33 28,30 42,32 56,25 70,28 84,20 100,22" fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 2"/>
            </svg>
          </div>
        </Box>
        <Box>
          <b style={{fontSize:13}}>待办</b>
          <div style={{marginTop:8}}>
            {[
              ["3 笔订单待发货","accent"],
              ["1 笔退款待处理","accent"],
              ["2 个门店授权申请","pop"],
              ["1 个员工申请加入","pop"],
            ].map(([t,tone])=>(
              <div key={t} className="row between" style={{padding:"5px 0", borderBottom:"1px dashed var(--line-soft)", fontSize:12}}>
                <span>· {t}</span><Tag tone={tone}>查看</Tag>
              </div>
            ))}
          </div>
        </Box>
      </div>
      <div style={{height:12}}></div>
      <Box>
        <div className="row between"><b style={{fontSize:13}}>热销 TOP 商品</b><span className="tiny muted">本周 ›</span></div>
        <table className="tbl dashed" style={{marginTop:6}}>
          <thead><tr><th>排名</th><th>商品</th><th>分类</th><th>销量</th><th>销售额</th><th>转化率</th></tr></thead>
          <tbody>
            {["实木餐桌","布艺沙发","北欧床","儿童椅","落地灯"].map((n,i)=>(
              <tr key={n}><td><Tag tone={i===0?"accent":"pop"}>{i+1}</Tag></td><td>{n}</td><td>家具</td><td>{200-i*30}</td><td>¥{(200-i*30)*1000}</td><td>{12-i}%</td></tr>
            ))}
          </tbody>
        </table>
      </Box>
    </PCWindow>
  );
}

function MAPC_Products() {
  return (
    <PCWindow idx="02" title="商家PC · 商品列表" url="merchant.99shop.com/products" side={MA_PC_SIDE} active={3}>
      <PCTopbar crumbs="商品 / 商品列表" title="商品管理" actions={<><Btn>导入 Excel</Btn><Btn tone="primary">＋ 添加商品</Btn></>} />
      <div className="row" style={{gap:8, marginBottom:8}}>
        <Input placeholder="搜索商品名 / SKU" sq lg icon="🔍" />
        <Box className="dashed" style={{padding:"4px 10px"}}><span className="tiny muted">分类</span> 全部 ⌄</Box>
        <Box className="dashed" style={{padding:"4px 10px"}}><span className="tiny muted">状态</span> 在售 ⌄</Box>
        <Box className="dashed" style={{padding:"4px 10px"}}><span className="tiny muted">价格</span> 全部 ⌄</Box>
        <span style={{marginLeft:"auto"}} className="tiny muted">共 1,283 件 · 已选 0</span>
      </div>
      <table className="tbl">
        <thead><tr><th style={{width:30}}>○</th><th>商品</th><th>SKU</th><th>分类</th><th>批发价</th><th>零售价</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {[1,2,3,4,5,6].map(i=>(
            <tr key={i}>
              <td>○</td>
              <td>
                <div className="row" style={{gap:6}}>
                  <Img h={36} style={{width:36}} x label=" "/>
                  <div><div>实木餐桌 {i}.4米 橡木</div><div className="tiny muted">北欧系列</div></div>
                </div>
              </td>
              <td className="tiny">SKU-18{i}0{i}</td>
              <td>家具/餐桌</td>
              <td>¥98{i}</td>
              <td style={{color:"var(--accent)", fontWeight:600}}>¥1,2{i}8</td>
              <td>2{i}</td>
              <td><Tag tone={i===5?"":"pop"}>{i===5?"下架":"在售"}</Tag></td>
              <td className="tiny"><span style={{color:"var(--accent)"}}>编辑</span> · 复制 · 下架</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{marginTop:10, gap:6}}>
        <Btn>批量上架</Btn><Btn>批量下架</Btn><Btn tone="dark">价格调整</Btn>
        <span style={{marginLeft:"auto"}} className="tiny muted">‹ 1 2 3 … 24 ›</span>
      </div>
    </PCWindow>
  );
}

function MAPC_AddProduct() {
  return (
    <PCWindow idx="03" title="商家PC · 添加商品" url="merchant.99shop.com/products/new" side={MA_PC_SIDE} active={4}>
      <PCTopbar crumbs="商品 / 添加商品" title="添加商品" actions={<><Btn>存为草稿</Btn><Btn tone="primary">保存并上架</Btn></>} />
      <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:14}}>
        <div className="col">
          <Box>
            <div className="label">基本信息</div>
            <div className="col" style={{marginTop:6, gap:8}}>
              <div><div className="tiny muted">商品名称</div><Input placeholder="如：实木北欧餐桌 1.4m 橡木" sq /></div>
              <div className="row" style={{gap:8}}>
                <div style={{flex:1}}><div className="tiny muted">平台分类</div><Box className="dashed">家具 › 餐桌 ›</Box></div>
                <div style={{flex:1}}><div className="tiny muted">厂家分类</div><Box className="dashed">北欧系列 ›</Box></div>
              </div>
              <div><div className="tiny muted">商品标签</div><div className="row" style={{gap:4}}><Tag>新品</Tag><Tag>包邮</Tag><Tag>厂家直发</Tag><Tag tone="dark">+ 标签</Tag></div></div>
            </div>
          </Box>
          <Box>
            <div className="label">图片 & 详情</div>
            <div className="row" style={{gap:6, marginTop:6, flexWrap:"wrap"}}>
              {[1,2,3,4,5].map(i=><Img key={i} h={64} style={{width:64}} x={i<4} label={i>=4?"+":" "}/>)}
            </div>
            <Box className="dashed" style={{marginTop:8, minHeight:60}}><div className="tiny muted">图文详情编辑区（富文本）…</div></Box>
          </Box>
          <Box>
            <div className="label">规格 SKU</div>
            <table className="tbl dashed" style={{marginTop:6}}>
              <thead><tr><th>规格组合</th><th>批发价</th><th>零售价</th><th>会员价</th><th>库存</th></tr></thead>
              <tbody>
                <tr><td>1.2m · 橡木</td><td>¥880</td><td>¥1,188</td><td>¥1,080</td><td>20</td></tr>
                <tr><td>1.4m · 橡木</td><td>¥980</td><td>¥1,288</td><td>¥1,180</td><td>25</td></tr>
                <tr><td>1.4m · 胡桃木</td><td>¥1,080</td><td>¥1,388</td><td>¥1,280</td><td>15</td></tr>
              </tbody>
            </table>
            <Btn sq>＋ 新增规格</Btn>
          </Box>
        </div>
        <div className="col">
          <Box className="fill">
            <div className="label">价格显示规则</div>
            <div className="col" style={{marginTop:6, gap:6, fontSize:12}}>
              <div className="row between"><span>● 未登录</span><Tag>不显示价格</Tag></div>
              <div className="row between"><span>● 普通客户</span><Tag>仅显示零售价</Tag></div>
              <div className="row between"><span>● 门店(已授权)</span><Tag tone="accent">可见批发价</Tag></div>
              <div className="row between"><span>● 平台会员</span><Tag>会员价</Tag></div>
            </div>
          </Box>
          <Box>
            <div className="label">物流配送</div>
            <div className="col" style={{marginTop:4, fontSize:12, gap:4}}>
              <div className="row between"><span>厂家直发</span><span>●</span></div>
              <div className="row between"><span>同城配送</span><span>○</span></div>
              <div className="row between"><span>自提</span><span>○</span></div>
            </div>
          </Box>
          <Box>
            <div className="label">权限设置</div>
            <div className="tiny muted" style={{marginTop:3}}>授权门店是否可上架，门店等级、加价范围…</div>
            <Btn sq>配置授权 ›</Btn>
          </Box>
        </div>
      </div>
    </PCWindow>
  );
}

function MAPC_Extension() {
  return (
    <PCWindow idx="04" title="商家PC · 产品扩展(申请代理)" url="merchant.99shop.com/products/extension" side={MA_PC_SIDE} active={6}>
      <PCTopbar crumbs="商品 / 产品扩展" title="搜索厂家商品 · 申请代理" actions={<><Btn>已申请记录</Btn><Btn tone="primary">批量加价</Btn></>} />
      <div className="row" style={{gap:8, marginBottom:8}}>
        <Input placeholder="搜索厂家名 / 商品 / 品牌" sq lg icon="🔍" />
        <Box className="dashed" style={{padding:"4px 10px"}}>分类 ⌄</Box>
        <Box className="dashed" style={{padding:"4px 10px"}}>地区 ⌄</Box>
        <Box className="dashed" style={{padding:"4px 10px"}}>评级 ⌄</Box>
      </div>
      <div className="grid3" style={{gap:10}}>
        {[1,2,3,4,5,6].map(i=>(
          <Box key={i}>
            <div className="row" style={{gap:6}}>
              <Img h={70} style={{width:70, flex:"0 0 70px"}} x label=" "/>
              <div style={{flex:1, fontSize:11}}>
                <div className="row between"><b>厂家商品 #{i}</b><Tag tone="pop">A级</Tag></div>
                <div className="muted tiny">XX家具厂 · 河北</div>
                <div className="row between" style={{marginTop:3}}><span style={{color:"var(--accent)",fontWeight:700}}>¥9{i}8</span><span className="tiny muted">代理 {30+i}家</span></div>
                <div className="tiny" style={{marginTop:3}}>建议加价 5-15%</div>
              </div>
            </div>
            <HL dashed />
            <div className="row between">
              <span className="tiny muted">○ 选择</span>
              <Btn tone="primary">申请代理</Btn>
            </div>
          </Box>
        ))}
      </div>
      <div style={{height:10}}></div>
      <Box className="fill">
        <div className="row between"><b style={{fontSize:13}}>已选 3 件 · 批量代理设置</b>
          <div className="row" style={{gap:6}}>
            <Box className="dashed" style={{padding:"3px 8px"}}>统一加价 +10%</Box>
            <Box className="dashed" style={{padding:"3px 8px"}}>价格自动同步 ●</Box>
            <Btn tone="primary">提交申请</Btn>
          </div>
        </div>
      </Box>
    </PCWindow>
  );
}

function MAPC_Orders() {
  return (
    <PCWindow idx="05" title="商家PC · 订单管理" url="merchant.99shop.com/orders" side={MA_PC_SIDE} active={7}>
      <PCTopbar crumbs="订单" title="订单列表" actions={<><Btn>导出</Btn><Btn tone="dark">打印面单</Btn></>} />
      <div className="row" style={{gap:6, marginBottom:8, fontSize:12}}>
        {["全部 1283","待付款 24","待发货 56","已发货 880","已完成 320","售后 3"].map((t,i)=>(
          <Tag key={t} tone={i===2?"accent":""}>{t}</Tag>
        ))}
        <span style={{marginLeft:"auto"}}><Input placeholder="订单号 / 客户 / 手机号" sq icon="🔍"/></span>
      </div>
      <table className="tbl">
        <thead><tr><th>○</th><th>订单号</th><th>客户</th><th>商品</th><th>金额</th><th>下单时间</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {[
            ["18202981","张先生","实木餐桌 ×1","¥1,288","05-11 09:21","待发货"],
            ["18202980","李女士","布艺沙发 ×1","¥3,288","05-11 08:14","待发货"],
            ["18202979","王同学","儿童椅 ×2","¥620","05-10 19:55","已发货"],
            ["18202978","赵阿姨","落地灯 ×1","¥480","05-10 16:02","已完成"],
            ["18202977","钱先生","北欧床 ×1","¥4,580","05-10 12:21","售后"],
          ].map(([no,c,p,a,t,st])=>(
            <tr key={no}>
              <td>○</td>
              <td className="tiny">{no}</td>
              <td>{c}</td>
              <td>{p}</td>
              <td style={{fontWeight:600, color:"var(--accent)"}}>{a}</td>
              <td className="tiny">{t}</td>
              <td><Tag tone={st==="待发货"?"accent":st==="售后"?"":"pop"}>{st}</Tag></td>
              <td className="tiny"><span style={{color:"var(--accent)"}}>详情</span> · 发货 · 备注</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PCWindow>
  );
}

function MAPC_Customers() {
  return (
    <PCWindow idx="06" title="商家PC · 客户管理" url="merchant.99shop.com/customers" side={MA_PC_SIDE} active={8}>
      <PCTopbar crumbs="客户管理 / 普通客户" title="客户列表" actions={<><Btn>导入</Btn><Btn tone="primary">＋ 添加</Btn></>} />
      <Box className="fill" style={{marginBottom:8, borderColor:"var(--accent)"}}>
        <div className="row between">
          <span style={{fontSize:12}}>🟢 <b>申请注册为门店 / 平台授权开放</b> — 当前开放中，注册申请通过后可申请代理</span>
          <Btn tone="dark">切换开关</Btn>
        </div>
      </Box>
      <div className="row" style={{gap:8, marginBottom:8, fontSize:12}}>
        {["普通客户 1280","分佣客户 96","门店客户 24","已授权可见批发 16","封禁 2"].map((t,i)=>(
          <Tag key={t} tone={i===0?"accent":""}>{t}</Tag>
        ))}
      </div>
      <table className="tbl">
        <thead><tr><th>头像</th><th>客户</th><th>手机号</th><th>地区</th><th>价格权限</th><th>订单</th><th>累计</th><th>分佣</th><th>操作</th></tr></thead>
        <tbody>
          {["张先生","李女士","王同学","赵阿姨","钱先生","孙女士"].map((n,i)=>(
            <tr key={n}>
              <td><div className="avatar sm">{n[0]}</div></td>
              <td><b>{n}</b></td>
              <td className="tiny">138****{i}{i}{i}{i}</td>
              <td>北京</td>
              <td><Tag tone={i<2?"accent":""}>{i<2?"批发价":"零售价"}</Tag></td>
              <td>{12-i}</td>
              <td style={{color:"var(--accent)"}}>¥{(i+1)*1280}</td>
              <td>{i<2?"开":"—"}</td>
              <td className="tiny"><span style={{color:"var(--accent)"}}>授权</span> · 详情</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PCWindow>
  );
}

function MAPC_Stores() {
  return (
    <PCWindow idx="07" title="商家PC · 门店管理 & 授权" url="merchant.99shop.com/stores" side={MA_PC_SIDE} active={9}>
      <PCTopbar crumbs="门店管理" title="门店列表 & 授权" actions={<><Btn>地图视图</Btn><Btn tone="primary">＋ 邀请门店</Btn></>} />
      <div style={{display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:14}}>
        <Box>
          <table className="tbl">
            <thead><tr><th>门店</th><th>等级</th><th>授权状态</th><th>有效期</th><th>位置</th></tr></thead>
            <tbody>
              {[
                ["望京旗舰店","A","已授权","2026-05-01","朝阳"],
                ["国贸店","B","已授权","2026-03-21","朝阳"],
                ["顺义店","B","待审核","—","顺义"],
                ["通州店","C","已取消","—","通州"],
              ].map(([n,l,s,d,a])=>(
                <tr key={n}>
                  <td><b>{n}</b><div className="tiny muted">138****000{n.length%5}</div></td>
                  <td><Tag tone={l==="A"?"accent":"pop"}>{l}</Tag></td>
                  <td><Tag tone={s==="已授权"?"accent":""}>{s}</Tag></td>
                  <td className="tiny">{d}</td>
                  <td className="tiny">{a}区</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        <Box>
          <div className="row between"><b style={{fontSize:13}}>授权配置 · 望京旗舰店</b><Tag tone="accent">A 级</Tag></div>
          <HL dashed />
          <div className="label">可查看价格</div>
          <div className="row" style={{gap:6, marginTop:4}}>
            <Tag tone="accent">批发价 ✓</Tag><Tag tone="accent">零售价 ✓</Tag><Tag>会员价 ○</Tag>
          </div>
          <div className="label" style={{marginTop:8}}>可上架商品 / 加价规则</div>
          <table className="tbl dashed">
            <tbody>
              <tr><td>● 家具/餐桌</td><td>+5%</td></tr>
              <tr><td>● 家具/沙发</td><td>+8%</td></tr>
              <tr><td>○ 灯具</td><td>—</td></tr>
              <tr><td>● 布艺</td><td>+10%</td></tr>
            </tbody>
          </table>
          <div className="label" style={{marginTop:8}}>授权有效期</div>
          <Box className="dashed">2025-05-01 → 2026-05-01 ›</Box>
          <div className="row" style={{gap:6, marginTop:10, justifyContent:"flex-end"}}>
            <Btn>取消授权(保留信息)</Btn>
            <Btn tone="primary">保存</Btn>
          </div>
        </Box>
      </div>
    </PCWindow>
  );
}

function MAPC_Shop() {
  return (
    <PCWindow idx="08" title="商家PC · 店铺装修" url="merchant.99shop.com/shop/decorate" side={MA_PC_SIDE} active={12}>
      <PCTopbar crumbs="店铺装修" title="主题 · 轮播 · 风格" actions={<><Btn>预览</Btn><Btn tone="primary">发布</Btn></>} />
      <div style={{display:"grid", gridTemplateColumns:"1fr 280px", gap:14}}>
        <Box>
          <div className="row between"><b style={{fontSize:13}}>预览</b><Tag>iPhone 15</Tag></div>
          <div style={{display:"flex", justifyContent:"center", padding:14}}>
            <div style={{width:200, height:380, border:"2px solid var(--ink)", borderRadius:24, background:"var(--card)", padding:6, position:"relative"}}>
              <div style={{height:"100%", border:"1.3px solid var(--ink)", borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column"}}>
                <div style={{height:18, background:"var(--paper-2)", borderBottom:"1px solid var(--ink)"}}></div>
                <div style={{padding:6}}>
                  <Img h={60} label="轮播图"/>
                  <div className="waterfall" style={{marginTop:6}}>
                    {[1,2,3,4].map(i=><div key={i} className="wf-card"><Img h={40} x label=" "/><div className="info"><div className="tiny">商品</div><div className="price">¥9x</div></div></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Box>
        <div className="col">
          <Box>
            <div className="label">主题色</div>
            <div className="row" style={{gap:6, marginTop:6}}>
              {["#e85d2e","#2c6fb5","#1a8a5b","#7a3fa3","#1a1a1a","#d4af37"].map(c=>
                <span key={c} className="swatch" style={{background:c, width:24, height:24}}></span>
              )}
            </div>
          </Box>
          <Box><div className="label">字体风格</div>
            <div className="row" style={{gap:6, marginTop:4}}>
              <Tag tone="accent">现代</Tag><Tag>典雅</Tag><Tag>俏皮</Tag><Tag>简约</Tag>
            </div>
          </Box>
          <Box><div className="label">轮播图</div>
            <div className="grid3" style={{gap:4, marginTop:4}}>
              <Img h={36} x label=" "/><Img h={36} x label=" "/><Img h={36} label="+"/>
            </div>
          </Box>
          <Box><div className="label">商品展示风格</div>
            <div className="col" style={{gap:4, marginTop:4}}>
              <div className="row between tiny"><span>● 瀑布流</span><span>★</span></div>
              <div className="row between tiny"><span>○ 双列</span><span></span></div>
              <div className="row between tiny"><span>○ 单列大图</span><span></span></div>
            </div>
          </Box>
        </div>
      </div>
    </PCWindow>
  );
}

function MAPC_Marketing() {
  return (
    <PCWindow idx="09" title="商家PC · 营销中心" url="merchant.99shop.com/marketing" side={MA_PC_SIDE} active={13}>
      <PCTopbar crumbs="营销中心" title="活动与优惠" actions={<><Btn>活动模板</Btn><Btn tone="primary">＋ 创建活动</Btn></>} />
      <div className="grid3" style={{gap:10, marginBottom:12}}>
        {[
          ["🎟️","优惠券","6个进行中","创建"],
          ["⚡","限时限量","2个进行中","创建"],
          ["👥","团购","3个进行中","创建"],
        ].map(([ic,t,d,btn])=>(
          <Box key={t} className="flat dashed">
            <div className="row between">
              <div className="row" style={{gap:8}}>
                <div style={{fontSize:24}}>{ic}</div>
                <div><b>{t}</b><div className="tiny muted">{d}</div></div>
              </div>
              <Btn tone="primary">{btn}</Btn>
            </div>
          </Box>
        ))}
      </div>
      <Box>
        <div className="row between"><b style={{fontSize:13}}>优惠券列表</b><Tag tone="accent">进行中 6</Tag></div>
        <table className="tbl dashed" style={{marginTop:6}}>
          <thead><tr><th>名称</th><th>类型</th><th>面额</th><th>领取/使用</th><th>有效期</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr><td>新客专享券</td><td>满减</td><td>满50减5</td><td>820 / 412</td><td>05-01 ~ 05-31</td><td><Tag tone="accent">进行中</Tag></td><td className="tiny">编辑 · 停用</td></tr>
            <tr><td>大额满减</td><td>满减</td><td>满800减80</td><td>312 / 86</td><td>05-01 ~ 06-30</td><td><Tag tone="accent">进行中</Tag></td><td className="tiny">编辑 · 停用</td></tr>
            <tr><td>VIP专享</td><td>折扣</td><td>9折</td><td>120 / 88</td><td>永久</td><td><Tag>已暂停</Tag></td><td className="tiny">编辑 · 启用</td></tr>
          </tbody>
        </table>
      </Box>
    </PCWindow>
  );
}

function MAPCScreens() {
  return (
    <Role id="merchant-pc" num="03" title="商家后台 · PC端" en="Merchant / Desktop" desc="PC 端面向运营场景，强调批量处理与表格化操作：商品批量管理、订单导出与面单打印、客户与门店授权管理、店铺装修等。">
      <Sub title="首页 / 数据 / 商品 / 订单">
        <div className="pc-stack">
          <MAPC_Home />
          <MAPC_Products />
          <MAPC_AddProduct />
          <MAPC_Extension />
          <MAPC_Orders />
        </div>
      </Sub>
      <Sub title="客户 / 门店 / 装修 / 营销">
        <div className="pc-stack">
          <MAPC_Customers />
          <MAPC_Stores />
          <MAPC_Shop />
          <MAPC_Marketing />
        </div>
      </Sub>
    </Role>
  );
}

window.MAPCScreens = MAPCScreens;
