// Platform admin - mobile APP screens

function PA_Home() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar title="平台管理 · 经纬科技" right="🔔" />
      <div className="pbody scroll">
        <Box className="fill">
          <div className="row between"><b style={{fontSize:11}}>平台概览</b><span className="tiny muted">今日 ›</span></div>
          <div className="grid2" style={{marginTop:6, gap:4}}>
            {[["商户","268"],["订单","1,820"],["交易额","¥98.2万"],["用户","3.2万"]].map(([t,v])=>(
              <Box key={t} className="dashed" style={{textAlign:"center"}}>
                <div className="tiny muted">{t}</div>
                <div style={{fontWeight:700, color:"var(--accent)"}}>{v}</div>
              </Box>
            ))}
          </div>
        </Box>
        <Box>
          <div className="row between"><b style={{fontSize:11}}>近 7 日注册趋势</b></div>
          <div className="chart-line" style={{height:64}}>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="0,30 14,28 28,18 42,24 56,12 70,15 84,10 100,8" fill="none" stroke="var(--accent)" strokeWidth="1.4"/></svg>
          </div>
        </Box>
        <Box style={{borderColor:"var(--accent)"}}>
          <div className="row between"><b style={{fontSize:11}}>待办</b><Tag tone="accent">8</Tag></div>
          <div className="col tiny" style={{gap:3, marginTop:3}}>
            <div className="row between"><span>· 待审核商户</span><Tag tone="accent">5</Tag></div>
            <div className="row between"><span>· 待审核商品</span><Tag tone="accent">3</Tag></div>
            <div className="row between"><span>· 售后投诉</span><Tag>1</Tag></div>
          </div>
        </Box>
        <div className="grid4" style={{gap:6}}>
          {["商户","商品","广告","会员"].map(t=>(
            <div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",fontSize:9,gap:2}}>
              <div style={{width:30,height:30,border:"1.4px solid var(--ink)",borderRadius:6, background:"var(--paper-2)"}}></div>
              {t}
            </div>
          ))}
        </div>
      </div>
      <TabBar items={["首页","商户","订单","数据","我的"]} active={0} />
    </React.Fragment>
  );
}

function PA_Audit() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="商户入驻审核" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["待审核","已通过","已驳回"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {[
          ["北京经纬科技","厂家","2025-05-11"],
          ["上海望舒灯饰","门店","2025-05-11"],
          ["广州简家具厂","厂家","2025-05-10"],
        ].map(([n,t,d])=>(
          <Box key={n}>
            <div className="row between" style={{fontSize:11}}>
              <b>{n}</b>
              <Tag tone={t==="厂家"?"accent":"pop"}>{t}</Tag>
            </div>
            <div className="muted tiny">申请时间 {d} · 联系人 张先生 138****</div>
            <div className="row" style={{gap:4, marginTop:4}}>
              <Img h={40} style={{width:40}} x label=" "/>
              <Img h={40} style={{width:40}} x label=" "/>
              <Img h={40} style={{width:40}} x label=" "/>
              <span className="tiny muted" style={{alignSelf:"center"}}>资质 +2</span>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>查看详情</Btn>
              <Btn>驳回</Btn>
              <Btn tone="primary">通过</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function PA_MerchantList() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="商户列表" right="🔍" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["全部","厂家","门店","已停用"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <Box className="fill" style={{margin:"4px 8px"}}>
        <div className="row between tiny">
          <span>🟢 厂家 & 门店所有按钮图标显示开关</span>
          <Tag tone="accent">常开</Tag>
        </div>
      </Box>
      <div className="pbody scroll">
        {[
          ["经纬科技","厂家","VIP年费","¥98.2万"],
          ["望舒灯饰","门店","月费","¥18.6万"],
          ["简家具","厂家","试用","¥4.2万"],
          ["北欧之家","门店","VIP年费","¥58.0万"],
        ].map(([n,t,m,gmv])=>(
          <Box key={n}>
            <div className="row" style={{gap:6}}>
              <div className="avatar">{n[0]}</div>
              <div style={{flex:1, fontSize:10}}>
                <div className="row between"><b>{n}</b><Tag tone={t==="厂家"?"accent":"pop"}>{t}</Tag></div>
                <div className="muted tiny">{m} · 累计 GMV {gmv}</div>
              </div>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>详情</Btn>
              <Btn>权限</Btn>
              <Btn tone="dark">停用</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function PA_ProductAudit() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="商品审核" right="⚙︎" />
      {/* 自动免审开关 */}
      <Box className="fill" style={{margin:"6px 8px 4px", borderColor:"var(--accent)"}}>
        <div className="row between" style={{fontSize:11}}>
          <span><b>🤖 自动通过 · 免审核</b></span>
          <span style={{display:"inline-flex", alignItems:"center", gap:3}}>
            <span style={{width:30, height:16, borderRadius:10, background:"var(--accent)", border:"1.3px solid var(--ink)", position:"relative"}}>
              <span style={{position:"absolute", right:1, top:1, width:12, height:12, borderRadius:"50%", background:"var(--card)", border:"1.2px solid var(--ink)"}}></span>
            </span>
            <span className="tiny" style={{color:"var(--accent)"}}>已开启</span>
          </span>
        </div>
        <div className="tiny muted" style={{marginTop:3}}>满足条件商品提交后无需人工审核，直接上架</div>
      </Box>
      <div style={{padding:"0 8px 4px"}}>
        <Box className="dashed">
          <div className="label">免审条件 (满足任一)</div>
          <div className="col tiny" style={{marginTop:3, gap:3}}>
            <div className="row between"><span>● 商户为 VIP 年费会员</span><Tag tone="accent">✓</Tag></div>
            <div className="row between"><span>● 商户信用 ≥ A 级</span><Tag tone="accent">✓</Tag></div>
            <div className="row between"><span>● 历史驳回率 &lt; 5%</span><Tag tone="accent">✓</Tag></div>
            <div className="row between"><span>○ 仅指定品类(家具/灯具)</span><Tag>○</Tag></div>
          </div>
          <HL dashed />
          <div className="row between tiny">
            <span>抽检比例</span><b>10% 随机抽检</b>
          </div>
        </Box>
      </div>
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["待审核 3","自动通过 86","已驳回 2"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {[1,2,3].map(i=>(
          <Box key={i}>
            <div className="row" style={{gap:6}}>
              <Img h={56} style={{width:56}} x label=" "/>
              <div style={{flex:1, fontSize:10}}>
                <div className="row between"><b>实木餐桌 商品 {i}</b><Tag tone={i===2?"pop":"accent"}>{i===2?"自动通过":"待审"}</Tag></div>
                <div className="muted tiny">经纬科技 · 家具/餐桌</div>
                <div className="muted tiny">¥1,288 · 提交 2025-05-1{i}</div>
              </div>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>详情</Btn>
              {i===2 ? <Btn>抽检</Btn> : <><Btn>驳回</Btn><Btn tone="primary">通过</Btn></>}
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function PA_Ad() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="广告管理" right="＋" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["广告位","创建","数据"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {[
          ["小程序首页轮播","客户端","进行中"],
          ["商家APP首页","厂家+门店","进行中"],
          ["商家详情顶部","门店","已结束"],
        ].map(([n,a,s])=>(
          <Box key={n}>
            <div className="row between" style={{fontSize:11}}>
              <b>{n}</b><Tag tone={s==="进行中"?"accent":""}>{s}</Tag>
            </div>
            <div className="muted tiny">目标：{a} · 曝光 18.2K · 点击 1.6K</div>
            <Img h={50} label="广告图预览" style={{marginTop:4}} />
            <div className="row" style={{justifyContent:"flex-end", gap:4, marginTop:4}}>
              <Btn>数据</Btn>
              <Btn>编辑</Btn>
            </div>
          </Box>
        ))}
        <Btn block tone="primary">＋ 创建广告 (目标: 厂家/门店/客户)</Btn>
      </div>
    </React.Fragment>
  );
}

function PA_Plaza() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="选品广场推送" right="＋" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["推送商品","推送厂家","推送记录"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {/* 数据 */}
        <div className="grid3" style={{gap:6}}>
          {[["在推商品","186"],["在推厂家","42"],["代理申请","1.3K"]].map(([t,v])=>(
            <Box key={t} className="dashed" style={{textAlign:"center"}}>
              <div className="tiny muted">{t}</div>
              <div style={{fontWeight:700, fontSize:14, color:"var(--accent)"}}>{v}</div>
            </Box>
          ))}
        </div>
        {/* 搜索 + 批量 */}
        <div className="row" style={{gap:4}}>
          <div style={{flex:1}}><Input placeholder="搜索商品 / 厂家" sq/></div>
          <Btn tone="primary">批量推送</Btn>
        </div>
        {/* 列表 */}
        {[
          ["实木餐桌 #001","经纬科技","¥1,288","🔥本周热推","在推","代理 128",true],
          ["真皮三人沙发","佛山家具厂","¥3,680","厂家直供","在推","代理 86",true],
          ["软包大床 1.8m","南方睡眠科技","¥2,180","新品","待上线","—",false],
          ["北欧岩板茶几","岩板工厂","¥980","高佣金 12%","待上线","—",false],
          ["智能升降桌","创智办公","¥2,380","新品","已下架","代理 12",false],
        ].map(([n,f,p,tag,s,d,on],i)=>(
          <Box key={i}>
            <div className="row" style={{gap:6}}>
              <Img h={48} solid style={{width:48, flex:"0 0 48px"}} label=" "/>
              <div style={{flex:1}}>
                <div className="row between"><b style={{fontSize:11}}>{n}</b><Tag tone={s==="在推"?"accent":s==="已下架"?"":"pop"}>{s}</Tag></div>
                <div className="tiny muted">{f}</div>
                <div className="row between" style={{marginTop:2}}>
                  <span style={{color:"var(--accent)", fontWeight:700, fontSize:11}}>{p}</span>
                  <Tag tone="accent">{tag}</Tag>
                </div>
                <div className="tiny muted" style={{marginTop:2}}>{d}</div>
              </div>
            </div>
            <div className="row" style={{gap:4, marginTop:4, justifyContent:"flex-end"}}>
              <Btn>编辑</Btn>
              <Btn tone={on?"":"primary"}>{on?"下架":"推送"}</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function PA_PlazaPush() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="新建推送" right="✓" />
      <div className="pbody scroll">
        <Box>
          <div className="label">推送对象</div>
          <div className="row" style={{gap:4, marginTop:3}}>
            <Tag tone="accent">商品</Tag><Tag>厂家</Tag>
          </div>
        </Box>
        <Box>
          <div className="label">选择内容(已选 6 件)</div>
          <div className="tiny" style={{marginTop:3}}>· 实木餐桌 #001</div>
          <div className="tiny">· 真皮三人沙发</div>
          <div className="tiny muted">… 还有 4 件 ›</div>
          <Btn sq>＋ 添加商品</Btn>
        </Box>
        <Box>
          <div className="label">推送位置</div>
          <div className="row" style={{gap:4, marginTop:3, flexWrap:"wrap"}}>
            <Tag tone="accent">商家APP · 广场入口</Tag>
            <Tag>广场首屏Banner</Tag>
            <Tag>分类首屏</Tag>
          </div>
        </Box>
        <Box>
          <div className="label">标签</div>
          <div className="row" style={{gap:3, marginTop:3, flexWrap:"wrap"}}>
            <Tag tone="accent">🔥本周热推</Tag><Tag>新品</Tag><Tag>厂家直供</Tag><Tag>高佣金</Tag><Tag>＋</Tag>
          </div>
        </Box>
        <Box>
          <div className="label">投放对象</div>
          <div className="row" style={{gap:4, marginTop:3}}>
            <Tag tone="accent">全部门店</Tag><Tag>指定区域</Tag><Tag>会员等级</Tag>
          </div>
        </Box>
        <Box>
          <div className="row between"><span className="tiny">排期</span><b className="tiny">05-11 → 06-11 ›</b></div>
          <div className="row between" style={{marginTop:3}}><span className="tiny">排序权重</span><b className="tiny">80 ›</b></div>
          <div className="row between" style={{marginTop:3}}><span className="tiny">建议加价</span><b className="tiny">¥200~500 ›</b></div>
          <div className="row between" style={{marginTop:3}}><span className="tiny">建议佣金</span><b className="tiny">8% ›</b></div>
        </Box>
        <Box>
          <div className="label">推送语</div>
          <Input placeholder="平台精选 · 厂家直供 · 一键代理" sq/>
        </Box>
        <div className="row" style={{gap:6}}>
          <Btn block>存草稿</Btn>
          <Btn block tone="primary">立即推送</Btn>
        </div>
      </div>
    </React.Fragment>
  );
}

function PA_Members() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="会员管理" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10, flexWrap:"wrap"}}>
        {["会员套餐","广告推送套餐","缴费订单","会员状态"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        <div className="label" style={{marginBottom:2}}>会员套餐(基础功能)</div>
        <Box className="dashed">
          <div className="row between"><b>月费套餐</b><Tag tone="accent">启用</Tag></div>
          <div style={{fontSize:18, fontWeight:700, color:"var(--accent)"}}>¥99 / 月</div>
          <div className="tiny muted">含：商品管理 · 门店授权 · 销售授权 · 客户授权</div>
          <Btn sq>编辑</Btn>
        </Box>
        <Box className="dashed">
          <div className="row between"><b>年费套餐</b><Tag tone="accent">启用</Tag></div>
          <div style={{fontSize:18, fontWeight:700, color:"var(--accent)"}}>¥899 / 年</div>
          <div className="tiny muted">含：以上 + 数据导出 · 营销中心</div>
          <Btn sq>编辑</Btn>
        </Box>

        <div className="label" style={{marginTop:6, marginBottom:2}}>广告推送套餐 <Tag tone="pop">新</Tag></div>
        <div className="tiny muted" style={{marginBottom:4}}>帮商户在选品广场/首页Banner获得曝光位，错峰出售</div>
        <Box className="dashed" style={{borderColor:"var(--accent)"}}>
          <div className="row between"><b>基础推广包</b><Tag tone="accent">启用</Tag></div>
          <div style={{fontSize:18, fontWeight:700, color:"var(--accent)"}}>¥299 / 月</div>
          <div className="tiny muted">· 选品广场 5 个推送位</div>
          <div className="tiny muted">· 权重 ≤ 60 · 不含首屏Banner</div>
          <div className="tiny muted">· 月曝光 ≤ 5万</div>
          <Btn sq>编辑</Btn>
        </Box>
        <Box className="dashed" style={{borderColor:"var(--accent)"}}>
          <div className="row between"><b>进阶推广包 <Tag tone="accent">HOT</Tag></b><Tag tone="accent">启用</Tag></div>
          <div style={{fontSize:18, fontWeight:700, color:"var(--accent)"}}>¥999 / 月</div>
          <div className="tiny muted">· 选品广场 20 个推送位</div>
          <div className="tiny muted">· 首屏Banner 2 个 · 权重 ≤ 85</div>
          <div className="tiny muted">· 可选双标签·月曝光 ≤ 30万</div>
          <Btn sq>编辑</Btn>
        </Box>
        <Box className="dashed" style={{borderColor:"var(--accent)"}}>
          <div className="row between"><b>旗舰推广包</b><Tag tone="accent">启用</Tag></div>
          <div style={{fontSize:18, fontWeight:700, color:"var(--accent)"}}>¥9,800 / 年</div>
          <div className="tiny muted">· 推送位不限 · 权重 ≤ 99</div>
          <div className="tiny muted">· 首屏Banner + 分类首屏 + 独立标签</div>
          <div className="tiny muted">· 年曝光 不限 · 专属运营顾问</div>
          <Btn sq>编辑</Btn>
        </Box>
        <Box className="fill">
          <div className="label">增值单项购买</div>
          <div className="col tiny" style={{gap:4, marginTop:3}}>
            <div className="row between"><span>· 首屏Banner / 周</span><b>¥199 ›</b></div>
            <div className="row between"><span>· 热推标签 / 件</span><b>¥39 ›</b></div>
            <div className="row between"><span>· 分类首屏 / 天</span><b>¥59 ›</b></div>
          </div>
        </Box>

        <Box className="fill">
          <div className="label">试用期</div>
          <div className="row between" style={{fontSize:11, marginTop:3}}>
            <span>新商户试用</span><b>30 天</b>
          </div>
        </Box>
        <Btn block sq>＋ 新增套餐</Btn>
      </div>
    </React.Fragment>
  );
}

function PA_PayOrders() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="会员缴费订单" />
      <div className="pbody scroll">
        {[
          ["#M20290","经纬科技","年费","¥899","已支付"],
          ["#M20289","望舒灯饰","月费","¥99","已支付"],
          ["#M20288","简家具","年费","¥899","退款中"],
        ].map(([no,n,p,a,s])=>(
          <Box key={no}>
            <div className="row between" style={{fontSize:10}}>
              <b>{no}</b><Tag tone={s==="退款中"?"":"accent"}>{s}</Tag>
            </div>
            <div className="muted tiny">{n} · {p}</div>
            <div className="row between" style={{marginTop:4}}>
              <span style={{color:"var(--accent)",fontWeight:700}}>{a}</span>
              <Btn>详情</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function PA_Perm() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="权限管理" right="＋" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["角色","管理员"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {["超级管理员","运营","审核员","客服"].map((r,i)=>(
          <Box key={r}>
            <div className="row between" style={{fontSize:11}}>
              <b>{r}</b><Tag tone={i===0?"accent":""}>{i+1} 人</Tag>
            </div>
            <div className="muted tiny">权限：{i===0?"全部":i===1?"运营 · 数据":i===2?"商户 · 商品审核":"客服"}</div>
            <div className="row" style={{justifyContent:"flex-end", gap:4, marginTop:4}}>
              <Btn>编辑权限</Btn>
              <Btn>成员</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function PA_System() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="系统设置" />
      <div className="pbody scroll">
        <Box>
          <div className="label">基础设置</div>
          <div className="col tiny" style={{gap:6, marginTop:4}}>
            <div className="row between"><span>· 注册商家上限</span><b>500 家 ›</b></div>
            <div className="row between"><span>· 平台名称</span><b>经纬科技 ›</b></div>
            <div className="row between"><span>· 客服电话</span><b>400-xxx ›</b></div>
            <div className="row between"><span>· 平台抽佣比例</span><b>2% ›</b></div>
          </div>
        </Box>
        <Box>
          <div className="label">系统配置</div>
          <div className="col tiny" style={{gap:6, marginTop:4}}>
            <div className="row between"><span>· 支付配置</span><span className="muted">›</span></div>
            <div className="row between"><span>· 短信配置</span><span className="muted">›</span></div>
            <div className="row between"><span>· 物流配置</span><span className="muted">›</span></div>
            <div className="row between"><span>· OSS / 存储</span><span className="muted">›</span></div>
          </div>
        </Box>
      </div>
    </React.Fragment>
  );
}

function PA_FeatureToggle() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="商家端功能开关" right="↻" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10, flexWrap:"wrap"}}>
        {["全平台","按角色","按商户"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        <div className="tiny muted">控制商家APP后台的按钮 / 图标 / 菜单显隐 · 立即生效</div>

        {/* 作用对象 */}
        <Box className="fill">
          <div className="label">作用对象</div>
          <div className="row" style={{gap:4, marginTop:3}}>
            <Tag tone="accent">全部商家</Tag><Tag>仅厂家</Tag><Tag>仅门店</Tag><Tag>指定商户</Tag>
          </div>
        </Box>

        {/* 首页快捷入口 */}
        <div className="label" style={{marginTop:4, marginBottom:2}}>商家首页 · 快捷入口</div>
        {[
          ["商品","🛒",true,"常开"],
          ["订单","📦",true,"常开"],
          ["客户","👥",true,"常开"],
          ["客服","💬",true,""],
          ["门店","🏪",true,"仅厂家可见"],
          ["员工","🧑‍💼",true,""],
          ["营销","🎯",true,""],
          ["数据","📊",true,""],
          ["选品广场","🛍️",true,"HOT"],
          ["量尺预约","📐",false,""],
        ].map(([n,ic,on,tag],i)=>(
          <Box key={i} style={{padding:"6px 8px"}}>
            <div className="row between">
              <div className="row" style={{gap:6}}>
                <span style={{fontSize:16}}>{ic}</span>
                <div>
                  <div style={{fontSize:11, fontWeight:600}}>{n}</div>
                  {tag && <span className="tiny" style={{color:tag==="常开"?"var(--accent-2)":"var(--accent)"}}>{tag}</span>}
                </div>
              </div>
              {/* 开关 */}
              <div style={{width:32, height:18, border:"1.4px solid var(--ink)", borderRadius:10, background:on?"var(--accent)":"var(--paper-2)", position:"relative"}}>
                <div style={{position:"absolute", top:1, left:on?15:1, width:14, height:14, background:"#fff", border:"1.2px solid var(--ink)", borderRadius:"50%"}}></div>
              </div>
            </div>
          </Box>
        ))}

        {/* 商户角色按钮 */}
        <div className="label" style={{marginTop:4, marginBottom:2}}>商户角色 · 入口按钮</div>
        {[
          ["申请注册为门店(平台授权按钮)",true,"图标常开"],
          ["申请注册为厂家(平台授权按钮)",true,"图标常开"],
          ["门店向厂家申请代理",true,""],
          ["厂家邀请门店",true,""],
          ["员工邀请",true,""],
        ].map(([n,on,tag],i)=>(
          <Box key={i} style={{padding:"6px 8px"}}>
            <div className="row between">
              <div style={{flex:1}}>
                <div style={{fontSize:11, fontWeight:600}}>{n}</div>
                {tag && <span className="tiny" style={{color:"var(--accent-2)"}}>{tag}</span>}
              </div>
              <div style={{width:32, height:18, border:"1.4px solid var(--ink)", borderRadius:10, background:on?"var(--accent)":"var(--paper-2)", position:"relative"}}>
                <div style={{position:"absolute", top:1, left:on?15:1, width:14, height:14, background:"#fff", border:"1.2px solid var(--ink)", borderRadius:"50%"}}></div>
              </div>
            </div>
          </Box>
        ))}

        {/* 模块菜单 */}
        <div className="label" style={{marginTop:4, marginBottom:2}}>侧边 / 二级菜单</div>
        {[
          ["产品扩展(申请代理)",true],
          ["分佣客户管理",true],
          ["提现处理",true],
          ["店铺装修",true],
          ["营销中心 · 团购",false],
          ["营销中心 · 限时购",true],
          ["在线客服(免费版)",true],
          ["数据导出(年费)",true],
        ].map(([n,on],i)=>(
          <Box key={i} style={{padding:"6px 8px"}}>
            <div className="row between">
              <span style={{fontSize:11}}>· {n}</span>
              <div style={{width:32, height:18, border:"1.4px solid var(--ink)", borderRadius:10, background:on?"var(--accent)":"var(--paper-2)", position:"relative"}}>
                <div style={{position:"absolute", top:1, left:on?15:1, width:14, height:14, background:"#fff", border:"1.2px solid var(--ink)", borderRadius:"50%"}}></div>
              </div>
            </div>
          </Box>
        ))}

        {/* 灰度发布 */}
        <Box className="dashed">
          <div className="label">灰度发布</div>
          <div className="row between" style={{marginTop:3, fontSize:11}}>
            <span>· 灰度比例</span><b>30% ›</b>
          </div>
          <div className="row between" style={{marginTop:3, fontSize:11}}>
            <span>· 灰度商户名单</span><b>查看(8) ›</b>
          </div>
          <div className="row between" style={{marginTop:3, fontSize:11}}>
            <span>· 生效时间</span><b>立即 / 定时 ›</b>
          </div>
        </Box>

        <div className="row" style={{gap:6, marginTop:6}}>
          <Btn block>预览效果</Btn>
          <Btn block tone="primary">保存并下发</Btn>
        </div>
        <div className="tiny muted" style={{textAlign:"center"}}>更新历史 · 共 12 条 ›</div>
      </div>
    </React.Fragment>
  );
}

function PAScreens() {
  return (
    <Role id="platform-app" num="04" title="平台管理 · APP端" en="Platform Admin / Mobile" desc="平台管理员移动端：商户审核、商品审核、广告投放、会员套餐、权限与系统设置等，便于异地办公与紧急审核。">
      <Sub title="平台数据 · 审核 · 商户">
        <div className="phone-row">
          <Phone idx="01" title="仪表盘"><PA_Home /></Phone>
          <Phone idx="02" title="商户入驻审核"><PA_Audit /></Phone>
          <Phone idx="03" title="商户列表"><PA_MerchantList /></Phone>
          <Phone idx="04" title="商品审核"><PA_ProductAudit /></Phone>
        </div>
      </Sub>
      <Sub title="广告 · 选品广场 · 会员 · 权限 · 系统">
        <div className="phone-row">
          <Phone idx="05" title="广告管理"><PA_Ad /></Phone>
          <Phone idx="06" title="选品广场推送"><PA_Plaza /></Phone>
          <Phone idx="07" title="新建推送"><PA_PlazaPush /></Phone>
          <Phone idx="08" title="会员&推广套餐"><PA_Members /></Phone>
          <Phone idx="09" title="缴费订单"><PA_PayOrders /></Phone>
          <Phone idx="10" title="商家端功能开关"><PA_FeatureToggle /></Phone>
          <Phone idx="11" title="权限管理"><PA_Perm /></Phone>
          <Phone idx="12" title="系统设置"><PA_System /></Phone>
        </div>
      </Sub>
    </Role>
  );
}

window.PAScreens = PAScreens;
