// Platform admin - PC desktop screens

const PA_PC_SIDE = {
  brand: "平台管理 PC",
  menu: [
    { label: "📊 仪表盘" },
    { label: "🏢 商户管理" },
    { label: "  · 入驻审核", sub: true },
    { label: "  · 商户列表", sub: true },
    { label: "📦 商品管理" },
    { label: "  · 商品审核", sub: true },
    { label: "  · 全平台商品", sub: true },
    { label: "  · 分类管理", sub: true },
    { label: "  · 选品广场推送", sub: true },
    { label: "📣 广告管理" },
    { label: "🧾 订单管理" },
    { label: "👥 客户管理" },
    { label: "📈 数据分析" },
    { label: "🔐 权限管理" },
    { label: "💬 售后客服" },
    { label: "💎 会员管理" },
    { label: "⚙️ 系统设置" },
  ],
};

function PAPC_Dashboard() {
  return (
    <PCWindow idx="01" title="平台PC · 仪表盘" url="admin.99shop.com/dashboard" side={PA_PC_SIDE} active={0}>
      <PCTopbar crumbs="仪表盘" title="平台数据概览" actions={<><Btn>导出报表</Btn><Btn tone="dark">📅 本月 ⌄</Btn></>} />
      <div className="grid4" style={{gap:10}}>
        {[
          ["商户总数","268","+8"],
          ["订单总数","18,209","+1,820"],
          ["交易额(月)","¥982万","+12%"],
          ["注册用户","32,108","+820"],
        ].map(([t,v,d])=>(
          <Box key={t} className="dashed flat">
            <div className="tiny muted">{t}</div>
            <div style={{fontSize:22,fontWeight:700,color:"var(--accent)"}}>{v}</div>
            <div className="tiny" style={{color:"var(--accent-2)"}}>{d}</div>
          </Box>
        ))}
      </div>
      <div style={{height:12}}></div>
      <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:12}}>
        <Box>
          <div className="row between"><b style={{fontSize:13}}>注册与交易趋势 · 近 30 日</b>
            <div className="row" style={{gap:4}}>
              <Tag tone="accent">新增商户</Tag><Tag>新增用户</Tag><Tag>交易额</Tag>
            </div>
          </div>
          <div className="chart-line" style={{height:160, marginTop:6}}>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none">
              <polyline points="0,30 10,28 20,24 30,26 40,20 50,18 60,14 70,16 80,9 90,12 100,6" fill="none" stroke="var(--accent)" strokeWidth="1.4"/>
              <polyline points="0,34 10,30 20,32 30,26 40,28 50,22 60,24 70,18 80,20 90,14 100,11" fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 2"/>
            </svg>
          </div>
        </Box>
        <Box>
          <b style={{fontSize:13}}>待办</b>
          <div style={{marginTop:6}}>
            {[
              ["5 个商户待审核","accent"],
              ["3 个商品待审核","accent"],
              ["2 个广告位待上线","pop"],
              ["1 起平台投诉","accent"],
              ["8 笔提现待复核","pop"],
            ].map(([t,tone])=>(
              <div key={t} className="row between" style={{padding:"6px 0", borderBottom:"1px dashed var(--line-soft)", fontSize:12}}>
                <span>· {t}</span><Tag tone={tone}>处理</Tag>
              </div>
            ))}
          </div>
        </Box>
      </div>
      <div style={{height:12}}></div>
      <div className="grid3" style={{gap:10}}>
        <Box><b style={{fontSize:12}}>商户类型分布</b>
          <div className="row" style={{gap:8, marginTop:8, alignItems:"center"}}>
            <div className="donut" style={{borderTopColor:"var(--accent)", borderRightColor:"var(--ink)"}}></div>
            <div className="col" style={{gap:3}}>
              <span className="lg-item"><span className="sw" style={{background:"var(--accent)"}}></span>厂家 38%</span>
              <span className="lg-item"><span className="sw" style={{background:"var(--ink)"}}></span>门店 62%</span>
            </div>
          </div>
        </Box>
        <Box><b style={{fontSize:12}}>各品类销售</b>
          <div className="chart-bars" style={{height:80, marginTop:8}}>
            {[6,8,5,9,4,7,5].map((h,i)=><div key={i} className={"b" + (i===3?" accent":"")} style={{height:`${h*10}%`}}></div>)}
          </div>
        </Box>
        <Box><b style={{fontSize:12}}>会员套餐分布</b>
          <table className="tbl dashed" style={{marginTop:6}}>
            <tbody>
              <tr><td>年费会员</td><td>128</td><td>48%</td></tr>
              <tr><td>月费会员</td><td>86</td><td>32%</td></tr>
              <tr><td>试用中</td><td>54</td><td>20%</td></tr>
            </tbody>
          </table>
        </Box>
      </div>
    </PCWindow>
  );
}

function PAPC_Audit() {
  return (
    <PCWindow idx="02" title="平台PC · 商户入驻审核" url="admin.99shop.com/merchants/audit" side={PA_PC_SIDE} active={2}>
      <PCTopbar crumbs="商户管理 / 入驻审核" title="待审核商户" actions={<><Btn>批量驳回</Btn><Btn tone="primary">批量通过</Btn></>} />
      <div className="row" style={{gap:6, marginBottom:8, fontSize:12}}>
        {["待审核 5","已通过 263","已驳回 12"].map((t,i)=>
          <Tag key={t} tone={i===0?"accent":""}>{t}</Tag>
        )}
        <span style={{marginLeft:"auto"}}><Input placeholder="商户名 / 联系人" sq icon="🔍"/></span>
      </div>
      <table className="tbl">
        <thead><tr><th>○</th><th>主体名称</th><th>类型</th><th>联系人</th><th>地区</th><th>资质</th><th>提交时间</th><th>操作</th></tr></thead>
        <tbody>
          {[
            ["北京经纬科技","厂家","张先生 / 138****0001","北京 · 朝阳"],
            ["上海望舒灯饰","门店","王女士 / 138****0002","上海 · 静安"],
            ["广州简家具厂","厂家","李先生 / 138****0003","广州 · 番禺"],
            ["杭州北欧之家","门店","刘女士 / 138****0004","杭州 · 西湖"],
            ["成都和居","门店","陈先生 / 138****0005","成都 · 锦江"],
          ].map(([n,t,c,a],i)=>(
            <tr key={n}>
              <td>○</td>
              <td><b>{n}</b><div className="tiny muted">{a}</div></td>
              <td><Tag tone={t==="厂家"?"accent":"pop"}>{t}</Tag></td>
              <td className="tiny">{c}</td>
              <td className="tiny">{a.split(" · ")[0]}</td>
              <td>
                <div className="row" style={{gap:3}}>
                  <Img h={24} style={{width:24}} x label=" "/>
                  <Img h={24} style={{width:24}} x label=" "/>
                  <span className="tiny muted">+2</span>
                </div>
              </td>
              <td className="tiny">2025-05-1{i+1}</td>
              <td className="tiny"><span style={{color:"var(--accent)"}}>详情</span> · 通过 · 驳回</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{marginTop:14}}>
        <Box className="fill">
          <div className="row between"><b style={{fontSize:13}}>审核详情 · 北京经纬科技</b><Tag tone="accent">厂家 · 待审核</Tag></div>
          <div style={{display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:12, marginTop:8}}>
            <div>
              <table className="tbl dashed">
                <tbody>
                  <tr><td>主体名称</td><td>北京经纬科技有限公司</td></tr>
                  <tr><td>统一社会信用代码</td><td>91110xxxxxxxxxxx</td></tr>
                  <tr><td>法人</td><td>张先生</td></tr>
                  <tr><td>联系电话</td><td>138****0001</td></tr>
                  <tr><td>经营品类</td><td>家具 / 灯具</td></tr>
                  <tr><td>经营地址</td><td>北京朝阳区xxx路88号</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div className="tiny muted">资质证件</div>
              <div className="grid2" style={{marginTop:4}}>
                <Img h={70} x label="营业执照"/>
                <Img h={70} x label="法人身份证"/>
                <Img h={70} x label="行业资质"/>
                <Img h={70} x label="店铺照片"/>
              </div>
              <div className="row" style={{gap:6, marginTop:8, justifyContent:"flex-end"}}>
                <Btn>驳回</Btn>
                <Btn tone="primary">通过审核</Btn>
              </div>
            </div>
          </div>
        </Box>
      </div>
    </PCWindow>
  );
}

function PAPC_Merchants() {
  return (
    <PCWindow idx="03" title="平台PC · 商户列表" url="admin.99shop.com/merchants" side={PA_PC_SIDE} active={3}>
      <PCTopbar crumbs="商户管理 / 商户列表" title="全部商户" actions={<><Btn>导出</Btn><Btn tone="dark">权限模板</Btn></>} />
      <Box className="fill" style={{marginBottom:8, borderColor:"var(--accent)"}}>
        <div className="row between">
          <span style={{fontSize:12}}>🟢 <b>厂家 & 门店所有按钮图标显示管理</b> — 平台统一控制，常开则商户后台始终显示授权入口</span>
          <Tag tone="accent">常开</Tag>
        </div>
      </Box>
      <div className="row" style={{gap:6, marginBottom:8, fontSize:12}}>
        {["全部 268","厂家 102","门店 166","VIP 214","试用 54","停用 4"].map((t,i)=>(
          <Tag key={t} tone={i===0?"accent":""}>{t}</Tag>
        ))}
        <span style={{marginLeft:"auto"}}><Input placeholder="商户名 / 商户号" sq icon="🔍"/></span>
      </div>
      <table className="tbl">
        <thead><tr><th>商户号</th><th>名称</th><th>类型</th><th>会员</th><th>剩余</th><th>商品</th><th>累计GMV</th><th>地区</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {[
            ["M10283","经纬科技","厂家","年费","287d","182","¥98.2万","北京"],
            ["M10284","望舒灯饰","门店","月费","12d","56","¥18.6万","上海"],
            ["M10285","简家具厂","厂家","试用","8d","23","¥4.2万","广州"],
            ["M10286","北欧之家","门店","年费","312d","98","¥58.0万","杭州"],
            ["M10287","和居","门店","月费","26d","42","¥12.0万","成都"],
          ].map(([id,n,t,m,r,p,g,a])=>(
            <tr key={id}>
              <td className="tiny">{id}</td>
              <td><b>{n}</b></td>
              <td><Tag tone={t==="厂家"?"accent":"pop"}>{t}</Tag></td>
              <td>{m}</td>
              <td className="tiny">{r}</td>
              <td>{p}</td>
              <td style={{color:"var(--accent)",fontWeight:600}}>{g}</td>
              <td className="tiny">{a}</td>
              <td><Tag tone="accent">正常</Tag></td>
              <td className="tiny"><span style={{color:"var(--accent)"}}>详情</span> · 权限 · 停用</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PCWindow>
  );
}

function PAPC_ProductAudit() {
  return (
    <PCWindow idx="04" title="平台PC · 商品审核" url="admin.99shop.com/products/audit" side={PA_PC_SIDE} active={5}>
      <PCTopbar crumbs="商品管理 / 商品审核" title="商品审核" actions={<Btn tone="primary">批量通过</Btn>} />
      <div className="row" style={{gap:6, marginBottom:8, fontSize:12}}>
        {["待审核 38","已通过","已驳回"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="grid4" style={{gap:10}}>
        {[1,2,3,4,5,6,7,8].map(i=>(
          <Box key={i} className="flat">
            <Img h={70} x label="商品图"/>
            <div style={{fontSize:11, marginTop:4}}><b>实木餐桌 #{i}</b></div>
            <div className="muted tiny">经纬科技 · ¥1,288</div>
            <div className="row" style={{gap:4, marginTop:4}}>
              <Btn>驳回</Btn>
              <Btn tone="primary">通过</Btn>
            </div>
          </Box>
        ))}
      </div>
    </PCWindow>
  );
}

function PAPC_Plaza() {
  return (
    <PCWindow idx="05" title="平台PC · 选品广场推送" url="admin.99shop.com/plaza/push" side={PA_PC_SIDE} active={8}>
      <PCTopbar crumbs="商品管理 / 选品广场推送" title="选品广场 · 推送管理" actions={<><Btn>推送记录</Btn><Btn tone="primary">＋ 新建推送</Btn></>} />
      {/* 数据概览 */}
      <div className="grid4" style={{gap:10, marginBottom:12}}>
        {[
          ["在推商品","186","+12"],
          ["在推厂家","42","+3"],
          ["7日代理申请","1,308","+18%"],
          ["代理成交额","¥86万","+22%"],
        ].map(([t,v,d])=>(
          <Box key={t} className="dashed flat">
            <div className="tiny muted">{t}</div>
            <div style={{fontSize:20,fontWeight:700,color:"var(--accent)"}}>{v}</div>
            <div className="tiny" style={{color:"var(--accent-2)"}}>{d}</div>
          </Box>
        ))}
      </div>
      {/* 切换 商品/厂家 */}
      <div className="row" style={{gap:6, marginBottom:6}}>
        <Tag tone="accent">推送商品</Tag><Tag>推送厂家</Tag><Tag>分组 / 标签</Tag><Tag>排期</Tag>
      </div>
      {/* 筛选条 + 推送按钮 */}
      <Box className="dashed flat" style={{marginBottom:10}}>
        <div className="row between">
          <div className="row" style={{gap:6}}>
            <Input placeholder="🔍 搜索商品名 / 厂家名 / ID" sq />
            <Tag>品类 ⌄</Tag>
            <Tag>厂家等级 ⌄</Tag>
            <Tag>价格区间 ⌄</Tag>
            <Tag>已推送 / 未推送 ⌄</Tag>
          </div>
          <div className="row" style={{gap:4}}>
            <Btn>批量下架</Btn>
            <Btn tone="primary">批量推送至广场</Btn>
          </div>
        </div>
      </Box>
      {/* 商品列表 */}
      <Box>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{width:24}}><input type="checkbox" /></th>
              <th>商品 / 厂家</th>
              <th>品类</th>
              <th>价格</th>
              <th>标签 / 分组</th>
              <th>推送位</th>
              <th>排序权重</th>
              <th>排期</th>
              <th>状态</th>
              <th>数据</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["实木餐桌 #001","经纬科技","家具","¥1,288","🔥本周热推","首页 + Banner","99","05-11 → 06-11","在推","代理 128｜成交 86","accent"],
              ["真皮三人沙发","佛山实木家具厂","家具","¥3,680","厂家直供","首页","85","05-08 → 06-08","在推","代理 86｜成交 42","accent"],
              ["软包大床 1.8m","南方睡眠科技","家具","¥2,180","新品","二级页","60","—","待上线","—","pop"],
              ["北欧岩板茶几","岩板工厂","家具","¥980","高佣金 12%","首页","70","05-15 → 05-30","待上线","—","pop"],
              ["真皮餐椅 4 件套","椅匠","家具","¥1,580","限时","首页 + Banner","90","05-11 → 05-18","在推","代理 56","accent"],
              ["智能升降桌","创智办公","办公","¥2,380","新品","二级页","50","—","已下架","代理 12","muted"],
            ].map((row,i)=>(
              <tr key={i}>
                <td><input type="checkbox" defaultChecked={i<2}/></td>
                <td>
                  <div style={{display:"flex", gap:6, alignItems:"center"}}>
                    <div style={{width:32,height:32,border:"1.2px solid var(--ink)", borderRadius:4, background:"var(--paper-2)"}}></div>
                    <div>
                      <div style={{fontWeight:600}}>{row[0]}</div>
                      <div className="tiny muted">{row[1]}</div>
                    </div>
                  </div>
                </td>
                <td>{row[2]}</td>
                <td style={{color:"var(--accent)", fontWeight:700}}>{row[3]}</td>
                <td><Tag tone={row[10]}>{row[4]}</Tag></td>
                <td>{row[5]}</td>
                <td><Input placeholder={row[6]} sq /></td>
                <td className="tiny">{row[7]}</td>
                <td><Tag tone={row[10]}>{row[8]}</Tag></td>
                <td className="tiny">{row[9]}</td>
                <td className="row" style={{gap:3}}>
                  <Btn>编辑</Btn>
                  <Btn tone={row[8]==="在推"?"":"primary"}>{row[8]==="在推"?"下架":"推送"}</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      <div style={{height:12}}></div>
      {/* 新建推送 - 表单 */}
      <Box>
        <div className="row between"><b style={{fontSize:13}}>＋ 新建推送 · 表单</b><span className="tiny muted">支持同时推送多个商品 / 厂家</span></div>
        <div className="grid3" style={{gap:8, marginTop:6}}>
          <div>
            <div className="tiny muted">推送对象</div>
            <div className="row" style={{gap:4, marginTop:3}}>
              <Tag tone="accent">商品</Tag><Tag>厂家</Tag>
            </div>
          </div>
          <div>
            <div className="tiny muted">选择内容</div>
            <Box className="dashed flat">实木餐桌 #001、真皮三人沙发 …已选 6 件 ›</Box>
          </div>
          <div>
            <div className="tiny muted">推送位置</div>
            <div className="row" style={{gap:4, marginTop:3, flexWrap:"wrap"}}>
              <Tag tone="accent">商家APP首页 · 选品广场入口</Tag>
              <Tag>广场首页 Banner</Tag>
              <Tag>分类首屏</Tag>
            </div>
          </div>
        </div>
        <div className="grid4" style={{gap:8, marginTop:8}}>
          <div>
            <div className="tiny muted">标签</div>
            <div className="row" style={{gap:3, marginTop:3, flexWrap:"wrap"}}>
              <Tag tone="accent">🔥本周热推</Tag><Tag>新品</Tag><Tag>厂家直供</Tag><Tag>高佣金</Tag><Tag>限时</Tag><Tag>＋ 自定义</Tag>
            </div>
          </div>
          <div>
            <div className="tiny muted">投放对象</div>
            <div className="row" style={{gap:3, marginTop:3}}>
              <Tag tone="accent">全部门店</Tag><Tag>指定区域</Tag><Tag>会员等级</Tag>
            </div>
          </div>
          <div>
            <div className="tiny muted">排期</div>
            <Box className="dashed flat">2026-05-11 → 2026-06-11</Box>
          </div>
          <div>
            <div className="tiny muted">排序权重(0-99)</div>
            <Input placeholder="80" sq />
          </div>
        </div>
        <div className="grid3" style={{gap:8, marginTop:8}}>
          <div>
            <div className="tiny muted">建议加价区间(指导价)</div>
            <div className="row" style={{gap:4}}>
              <Input placeholder="¥200" sq /><span>~</span><Input placeholder="¥500" sq />
            </div>
          </div>
          <div>
            <div className="tiny muted">建议佣金比例</div>
            <Input placeholder="8 %" sq />
          </div>
          <div>
            <div className="tiny muted">备注 / 推送语</div>
            <Input placeholder="平台精选 · 厂家直供 · 一键代理" sq />
          </div>
        </div>
        <div className="row" style={{gap:6, marginTop:10, justifyContent:"flex-end"}}>
          <Btn>存为草稿</Btn>
          <Btn>预览效果</Btn>
          <Btn tone="primary">立即推送</Btn>
        </div>
      </Box>
    </PCWindow>
  );
}

function PAPC_Ad() {
  return (
    <PCWindow idx="06" title="平台PC · 广告管理" url="admin.99shop.com/ads" side={PA_PC_SIDE} active={9}>
      <PCTopbar crumbs="广告管理" title="广告位 & 投放" actions={<Btn tone="primary">＋ 创建广告</Btn>} />
      <div className="grid3" style={{gap:10, marginBottom:12}}>
        {[
          ["小程序首页轮播","客户端","进行中","18.2K"],
          ["商家APP首页","厂家+门店","进行中","8.6K"],
          ["商家详情顶部","门店","待上线","—"],
        ].map(([n,a,s,e])=>(
          <Box key={n} className="flat">
            <div className="row between"><b>{n}</b><Tag tone={s==="进行中"?"accent":"pop"}>{s}</Tag></div>
            <div className="muted tiny">目标：{a}</div>
            <Img h={80} label="广告创意预览" style={{marginTop:4}}/>
            <div className="row between" style={{marginTop:4, fontSize:11}}>
              <span>曝光 {e}</span>
              <Btn>编辑</Btn>
            </div>
          </Box>
        ))}
      </div>
      <Box>
        <div className="row between"><b style={{fontSize:13}}>创建广告</b><span className="tiny muted">投放目标决定展示位置</span></div>
        <div className="grid3" style={{gap:8, marginTop:6}}>
          <div><div className="tiny muted">投放目标</div>
            <div className="row" style={{gap:4, marginTop:3}}>
              <Tag tone="accent">客户(C端)</Tag><Tag>厂家</Tag><Tag>门店</Tag>
            </div>
          </div>
          <div><div className="tiny muted">广告位</div><Box className="dashed">小程序首页轮播 ›</Box></div>
          <div><div className="tiny muted">投放时段</div><Box className="dashed">2025-05-11 → 2025-06-11</Box></div>
        </div>
        <div className="grid3" style={{gap:8, marginTop:6}}>
          <Img h={80} label="上传图/视频" />
          <Box><div className="tiny muted">链接</div><Input placeholder="商品ID / H5 / 小程序路径" sq/></Box>
          <Box><div className="tiny muted">预算 / 价格</div><Input placeholder="¥1000" sq/></Box>
        </div>
      </Box>
    </PCWindow>
  );
}

function PAPC_Orders() {
  return (
    <PCWindow idx="07" title="平台PC · 全平台订单" url="admin.99shop.com/orders" side={PA_PC_SIDE} active={10}>
      <PCTopbar crumbs="订单管理" title="全平台订单" actions={<><Btn>导出</Btn><Btn tone="dark">异常订单</Btn></>} />
      <div className="row" style={{gap:6, marginBottom:8, fontSize:12}}>
        {["全部","待付款","待发货","已发货","已完成","售后"].map((t,i)=>(
          <Tag key={t} tone={i===0?"accent":""}>{t}</Tag>
        ))}
        <span style={{marginLeft:"auto"}} className="row" style={{gap:6}}>
          <Input placeholder="订单号 / 商户 / 客户" sq icon="🔍" />
          <Box className="dashed" style={{padding:"4px 10px"}}>日期 ⌄</Box>
        </span>
      </div>
      <table className="tbl">
        <thead><tr><th>订单号</th><th>商户</th><th>客户</th><th>商品</th><th>金额</th><th>分佣</th><th>下单</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {[
            ["P18202981","经纬科技","张先生","实木餐桌","¥1,288","¥128","05-11 09:21","待发货"],
            ["P18202980","望舒灯饰","李女士","落地灯","¥480","¥40","05-11 08:14","已完成"],
            ["P18202979","北欧之家","王同学","儿童椅","¥620","—","05-10 19:55","已发货"],
            ["P18202978","简家具","赵阿姨","北欧床","¥4,580","¥458","05-10 16:02","售后"],
            ["P18202977","和居","钱先生","布艺沙发","¥3,288","¥328","05-10 12:21","已完成"],
          ].map(([no,m,c,p,a,com,t,st])=>(
            <tr key={no}>
              <td className="tiny">{no}</td>
              <td>{m}</td>
              <td>{c}</td>
              <td>{p}</td>
              <td style={{color:"var(--accent)",fontWeight:600}}>{a}</td>
              <td>{com}</td>
              <td className="tiny">{t}</td>
              <td><Tag tone={st==="待发货"?"accent":st==="售后"?"":"pop"}>{st}</Tag></td>
              <td className="tiny"><span style={{color:"var(--accent)"}}>详情</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </PCWindow>
  );
}

function PAPC_Analytics() {
  return (
    <PCWindow idx="08" title="平台PC · 数据分析" url="admin.99shop.com/analytics" side={PA_PC_SIDE} active={12}>
      <PCTopbar crumbs="数据分析" title="功能 · 商户 · 交易" actions={<Btn>导出报告</Btn>} />
      <div className="row" style={{gap:6, marginBottom:10}}>
        {["功能使用分析","商户分析","交易分析"].map((t,i)=>(
          <Tag key={t} tone={i===0?"accent":""}>{t}</Tag>
        ))}
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
        <Box>
          <b style={{fontSize:13}}>功能使用 · 热度 TOP</b>
          <table className="tbl dashed" style={{marginTop:6}}>
            <thead><tr><th>功能</th><th>使用次数</th><th>商户覆盖</th><th>趋势</th></tr></thead>
            <tbody>
              <tr><td>商品管理</td><td>18,202</td><td>98%</td><td>📈 +12%</td></tr>
              <tr><td>订单发货</td><td>16,820</td><td>92%</td><td>📈 +8%</td></tr>
              <tr><td>门店授权</td><td>3,820</td><td>62%</td><td>📈 +28%</td></tr>
              <tr><td>佣金设置</td><td>1,820</td><td>32%</td><td>📈 +5%</td></tr>
              <tr><td>店铺装修</td><td>2,820</td><td>78%</td><td>— 0%</td></tr>
            </tbody>
          </table>
        </Box>
        <Box>
          <b style={{fontSize:13}}>商户增长</b>
          <div className="chart-line" style={{height:130, marginTop:6}}>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="0,34 14,30 28,32 42,24 56,20 70,15 84,12 100,6" fill="none" stroke="var(--accent)" strokeWidth="1.4"/></svg>
          </div>
        </Box>
        <Box>
          <b style={{fontSize:13}}>交易额 · 品类</b>
          <div className="chart-bars" style={{height:120, marginTop:6}}>
            {[7,9,5,8,4,6,3,7].map((h,i)=><div key={i} className={"b" + (i===1?" accent":"")} style={{height:`${h*10}%`}}></div>)}
          </div>
          <div className="row" style={{gap:8, marginTop:4}}>
            <span className="lg-item"><span className="sw" style={{background:"var(--accent)"}}></span>家具</span>
            <span className="lg-item"><span className="sw" style={{background:"var(--ink)"}}></span>其他</span>
          </div>
        </Box>
        <Box>
          <b style={{fontSize:13}}>地区分布</b>
          <table className="tbl dashed" style={{marginTop:6}}>
            <thead><tr><th>地区</th><th>商户</th><th>GMV</th></tr></thead>
            <tbody>
              <tr><td>北京</td><td>82</td><td>¥320万</td></tr>
              <tr><td>上海</td><td>56</td><td>¥220万</td></tr>
              <tr><td>广州</td><td>48</td><td>¥180万</td></tr>
              <tr><td>杭州</td><td>32</td><td>¥120万</td></tr>
              <tr><td>成都</td><td>26</td><td>¥80万</td></tr>
            </tbody>
          </table>
        </Box>
      </div>
    </PCWindow>
  );
}

function PAPC_Perm() {
  return (
    <PCWindow idx="09" title="平台PC · 权限管理" url="admin.99shop.com/permissions" side={PA_PC_SIDE} active={13}>
      <PCTopbar crumbs="权限管理 / 角色管理" title="角色 & 管理员" actions={<Btn tone="primary">＋ 新建角色</Btn>} />
      <div style={{display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:14}}>
        <Box>
          <b style={{fontSize:13}}>角色列表</b>
          <table className="tbl dashed" style={{marginTop:6}}>
            <thead><tr><th>角色</th><th>人数</th><th>操作</th></tr></thead>
            <tbody>
              <tr style={{background:"var(--paper-2)"}}><td><b>超级管理员</b></td><td>1</td><td>—</td></tr>
              <tr><td>运营</td><td>4</td><td>编辑</td></tr>
              <tr><td>审核员</td><td>6</td><td>编辑</td></tr>
              <tr><td>客服</td><td>8</td><td>编辑</td></tr>
              <tr><td>财务</td><td>2</td><td>编辑</td></tr>
            </tbody>
          </table>
        </Box>
        <Box>
          <b style={{fontSize:13}}>权限配置 · 审核员</b>
          <HL dashed />
          <table className="tbl dashed">
            <thead><tr><th>模块</th><th>查看</th><th>编辑</th><th>审核</th><th>删除</th></tr></thead>
            <tbody>
              <tr><td>商户</td><td>●</td><td>●</td><td>●</td><td>○</td></tr>
              <tr><td>商品</td><td>●</td><td>○</td><td>●</td><td>○</td></tr>
              <tr><td>订单</td><td>●</td><td>○</td><td>○</td><td>○</td></tr>
              <tr><td>广告</td><td>●</td><td>●</td><td>●</td><td>○</td></tr>
              <tr><td>会员</td><td>●</td><td>○</td><td>○</td><td>○</td></tr>
              <tr><td>系统设置</td><td>○</td><td>○</td><td>○</td><td>○</td></tr>
            </tbody>
          </table>
          <div className="row" style={{gap:6, marginTop:8, justifyContent:"flex-end"}}>
            <Btn>另存为模板</Btn>
            <Btn tone="primary">保存</Btn>
          </div>
        </Box>
      </div>
    </PCWindow>
  );
}

function PAPC_Members() {
  return (
    <PCWindow idx="10" title="平台PC · 会员管理" url="admin.99shop.com/members" side={PA_PC_SIDE} active={15}>
      <PCTopbar crumbs="会员管理" title="套餐 · 缴费 · 状态" actions={<Btn tone="primary">＋ 新增套餐</Btn>} />
      <div className="row" style={{gap:6, marginBottom:10, fontSize:12}}>
        {["套餐设置","缴费订单","会员状态"].map((t,i)=>(
          <Tag key={t} tone={i===0?"accent":""}>{t}</Tag>
        ))}
      </div>
      <div className="grid3" style={{gap:10, marginBottom:12}}>
        {[
          ["月费","¥99 / 月","商品 · 门店 · 销售 · 客户授权","启用"],
          ["年费","¥899 / 年","以上 + 数据导出 + 营销中心","启用"],
          ["试用","30 天","所有功能限时体验","常开"],
        ].map(([t,p,d,s])=>(
          <Box key={t} className="dashed flat" style={{borderColor:t==="年费"?"var(--accent)":""}}>
            <div className="row between"><b>{t}</b><Tag tone="accent">{s}</Tag></div>
            <div style={{fontSize:20, fontWeight:700, color:"var(--accent)"}}>{p}</div>
            <div className="tiny muted" style={{marginTop:3}}>{d}</div>
            <div className="row" style={{gap:6, marginTop:6}}><Btn>功能配置</Btn><Btn>编辑</Btn></div>
          </Box>
        ))}
      </div>
      <Box>
        <div className="row between"><b style={{fontSize:13}}>商户会员状态</b><span className="tiny muted">手动调整支持</span></div>
        <table className="tbl dashed" style={{marginTop:6}}>
          <thead><tr><th>商户</th><th>套餐</th><th>开始</th><th>到期</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr><td>经纬科技</td><td>年费</td><td>2024-08-21</td><td>2026-02-21</td><td><Tag tone="accent">正常</Tag></td><td className="tiny">手动调整</td></tr>
            <tr><td>望舒灯饰</td><td>月费</td><td>2025-04-23</td><td>2025-05-23</td><td><Tag tone="accent">正常</Tag></td><td className="tiny">手动调整</td></tr>
            <tr><td>简家具</td><td>试用</td><td>2025-05-03</td><td>2025-06-02</td><td><Tag tone="pop">试用</Tag></td><td className="tiny">手动调整</td></tr>
            <tr><td>和居</td><td>月费</td><td>2025-03-15</td><td>2025-04-15</td><td><Tag>已过期</Tag></td><td className="tiny">手动调整</td></tr>
          </tbody>
        </table>
      </Box>
    </PCWindow>
  );
}

function PAPC_Settings() {
  return (
    <PCWindow idx="11" title="平台PC · 系统设置" url="admin.99shop.com/settings" side={PA_PC_SIDE} active={16}>
      <PCTopbar crumbs="系统设置" title="基础设置 & 系统配置" actions={<Btn tone="primary">保存</Btn>} />
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
        <Box>
          <b style={{fontSize:13}}>基础设置</b>
          <HL dashed />
          <table className="tbl dashed">
            <tbody>
              <tr><td>平台名称</td><td>经纬科技</td></tr>
              <tr><td>平台 Logo</td><td><Img h={36} style={{width:80}} label="上传"/></td></tr>
              <tr><td>注册商家上限</td><td>500 家</td></tr>
              <tr><td>试用期天数</td><td>30 天</td></tr>
              <tr><td>客服电话</td><td>400-***-****</td></tr>
              <tr><td>平台抽佣比例</td><td>2%</td></tr>
              <tr><td>厂家/门店开关</td><td><Tag tone="accent">常开</Tag></td></tr>
            </tbody>
          </table>
        </Box>
        <Box>
          <b style={{fontSize:13}}>系统配置</b>
          <HL dashed />
          <div className="col" style={{gap:8}}>
            {[
              ["💳","支付配置","微信 / 支付宝 / 余额"],
              ["📩","短信配置","阿里云 SMS"],
              ["📦","物流配置","顺丰 / 京东 / 自定义"],
              ["☁️","对象存储 (OSS)","阿里云 OSS"],
              ["🔒","安全配置","登录 / 二次验证 / IP 白名单"],
              ["🪪","实名认证","三方接口"],
            ].map(([ic,t,d])=>(
              <div key={t} className="row between" style={{padding:"6px 0", borderBottom:"1px dashed var(--line-soft)"}}>
                <div className="row" style={{gap:8}}>
                  <span style={{fontSize:18}}>{ic}</span>
                  <div><b style={{fontSize:12}}>{t}</b><div className="tiny muted">{d}</div></div>
                </div>
                <Btn>配置</Btn>
              </div>
            ))}
          </div>
        </Box>
      </div>
    </PCWindow>
  );
}

function PAPCScreens() {
  return (
    <Role id="platform-pc" num="05" title="平台管理 · PC端" en="Platform Admin / Desktop" desc="平台核心运营场所：商户与商品审核、广告投放、会员套餐、权限管理、数据分析与系统配置。">
      <Sub title="数据 · 商户 · 商品">
        <div className="pc-stack">
          <PAPC_Dashboard />
          <PAPC_Audit />
          <PAPC_Merchants />
          <PAPC_ProductAudit />
          <PAPC_Plaza />
        </div>
      </Sub>
      <Sub title="广告 · 订单 · 数据分析">
        <div className="pc-stack">
          <PAPC_Ad />
          <PAPC_Orders />
          <PAPC_Analytics />
        </div>
      </Sub>
      <Sub title="权限 · 会员 · 系统">
        <div className="pc-stack">
          <PAPC_Perm />
          <PAPC_Members />
          <PAPC_Settings />
        </div>
      </Sub>
    </Role>
  );
}

window.PAPCScreens = PAPCScreens;
