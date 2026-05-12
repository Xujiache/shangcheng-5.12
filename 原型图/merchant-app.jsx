// Merchant APP backend - mobile screens

function MA_Home() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar title="经纬科技 · 商家版" right="🔔" />
      <div className="pbody scroll">
        <Img h={70} label="平台广告位 · 商家专享" />
        <div className="grid3" style={{gap:6}}>
          {[["今日订单","23","+8%"],["新客户","6","+2"],["销售额","¥9,820","+12%"]].map(([t,v,d])=>(
            <Box key={t} className="dashed" style={{textAlign:"center"}}>
              <div className="tiny muted">{t}</div>
              <div style={{fontWeight:700, fontSize:15, color:"var(--accent)"}}>{v}</div>
              <div className="tiny" style={{color:"var(--accent-2)"}}>{d}</div>
            </Box>
          ))}
        </div>
        <div style={{fontSize:11, fontWeight:700}}>快捷入口</div>
        <div className="grid4" style={{gap:6}}>
          {["商品","订单","客户","客服","门店","员工","营销","数据"].map(t=>(
            <div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",fontSize:9,gap:2}}>
              <div style={{width:30,height:30,border:"1.4px solid var(--ink)",borderRadius:6, background:"var(--paper-2)"}}></div>
              {t}
            </div>
          ))}
        </div>
        {/* 选品广场 入口 */}
        <Box style={{borderColor:"var(--accent)", background:"linear-gradient(90deg, #fff5ec 0%, var(--card) 80%)"}}>
          <div className="row between">
            <div className="row" style={{gap:8}}>
              <div style={{fontSize:22}}>🛍️</div>
              <div>
                <div style={{fontWeight:700, fontSize:12}}>选品广场 <Tag tone="accent">HOT</Tag></div>
                <div className="tiny muted">平台精选 · 厂家直推 · 一键代理</div>
              </div>
            </div>
            <Btn tone="primary">进入 ›</Btn>
          </div>
          <div style={{display:"flex", gap:5, overflowX:"auto", marginTop:6, scrollbarWidth:"none"}}>
            {[1,2,3,4,5].map(i=>(
              <div key={i} style={{flex:"0 0 60px", border:"1.2px solid var(--ink)", borderRadius:4, background:"var(--card)", overflow:"hidden"}}>
                <Img h={40} x label=" " style={{borderRadius:0, border:"none"}}/>
                <div style={{fontSize:8, padding:"1px 3px"}}>
                  <div style={{color:"var(--accent)", fontWeight:700}}>¥9{i}8</div>
                </div>
              </div>
            ))}
          </div>
        </Box>
        <Box>
          <div className="row between"><b style={{fontSize:11}}>本周销售</b><span className="tiny muted">查看 ›</span></div>
          <div className="chart-bars" style={{marginTop:4}}>
            {[3,5,4,7,6,8,5].map((h,i)=><div key={i} className="b" style={{height:`${h*8}%`}}></div>)}
          </div>
        </Box>
        <Box>
          <div className="row between"><b style={{fontSize:11}}>待办</b><Tag tone="accent">5</Tag></div>
          <div className="tiny" style={{marginTop:3}}>· 3 笔订单待发货</div>
          <div className="tiny">· 1 笔退款待处理</div>
          <div className="tiny">· 1 个门店授权申请</div>
        </Box>
      </div>
      <TabBar items={["首页","商品","订单","数据","我的"]} active={0} />
    </React.Fragment>
  );
}

function MA_Stats() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="数据统计" right="📅" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["今日","本周","本月","本年"].map((t,i)=>(
          <Tag key={t} tone={i===1?"accent":""}>{t}</Tag>
        ))}
      </div>
      <div className="pbody scroll">
        <Box>
          <div className="tiny muted">销售趋势</div>
          <div className="chart-line">
            <svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="0,30 15,22 30,28 45,15 60,18 75,10 100,14" fill="none" stroke="var(--accent)" strokeWidth="1.5"/></svg>
          </div>
        </Box>
        <Box>
          <div className="row between"><b style={{fontSize:11}}>热销 TOP 10</b><span className="tiny muted">查看全部 ›</span></div>
          {[["实木餐桌",128],["布艺沙发",96],["北欧床",82],["儿童椅",65]].map(([n,v],i)=>(
            <div key={n} className="row" style={{gap:6, padding:"3px 0", borderBottom:"1px dashed var(--line-soft)"}}>
              <Tag tone={i===0?"accent":"pop"}>{i+1}</Tag>
              <span className="tiny" style={{flex:1}}>{n}</span>
              <span className="tiny muted">售 {v}</span>
            </div>
          ))}
        </Box>
        <div className="grid2">
          <Box><div className="tiny muted">商品分析</div><div className="chart-bars" style={{marginTop:4, height:50}}>{[4,6,3,7,5].map((h,i)=><div key={i} className={"b" + (i===3?" accent":"")} style={{height:`${h*10}%`}}></div>)}</div></Box>
          <Box><div className="tiny muted">客户分析</div>
            <div className="row" style={{gap:6, marginTop:4, alignItems:"center"}}>
              <div className="donut"></div>
              <div className="col" style={{gap:2}}>
                <span className="lg-item"><span className="sw" style={{background:"var(--accent)"}}></span>新客 36%</span>
                <span className="lg-item"><span className="sw" style={{background:"var(--ink)"}}></span>老客 64%</span>
              </div>
            </div>
          </Box>
        </div>
      </div>
      <TabBar items={["首页","商品","订单","数据","我的"]} active={3} />
    </React.Fragment>
  );
}

function MA_ProductList() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="商品" right="＋添加" />
      <div style={{padding:"6px 8px"}}>
        <div className="search-bar">🔍<span className="placeholder">商品名 / 编号</span></div>
      </div>
      <div className="row" style={{padding:"0 8px 4px", gap:6, fontSize:10}}>
        {["全部","在售","下架","审核中"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
        <span style={{marginLeft:"auto"}} className="tiny muted">筛选 ⌄</span>
      </div>
      <div className="pbody scroll">
        {[1,2,3,4].map(i=>(
          <Box key={i}>
            <div className="row" style={{gap:6}}>
              <span style={{fontSize:13}}>○</span>
              <Img h={56} style={{width:56, flex:"0 0 56px"}} x label=" "/>
              <div style={{flex:1, fontSize:10}}>
                <div className="row between"><span>商品 #{i} 实木餐桌</span><Tag tone={i===3?"":"pop"}>{i===3?"下架":"在售"}</Tag></div>
                <div className="muted tiny">编号 SKU-1820{i}</div>
                <div className="row between" style={{marginTop:3}}>
                  <span style={{color:"var(--accent)", fontWeight:700}}>¥1,288</span>
                  <span className="tiny muted">库存 25</span>
                </div>
              </div>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>编辑</Btn>
              <Btn>下架</Btn>
              <Btn tone="dark">推广</Btn>
            </div>
          </Box>
        ))}
      </div>
      <div style={{height:38, flex:"0 0 38px", borderTop:"1.4px solid var(--ink)", display:"flex", alignItems:"center", padding:"0 8px", gap:6, background:"var(--paper-2)", fontSize:10}}>
        <span>● 全选</span>
        <Btn>批量上架</Btn>
        <Btn>批量下架</Btn>
        <Btn tone="dark">导出</Btn>
      </div>
      <TabBar items={["首页","商品","订单","数据","我的"]} active={1} />
    </React.Fragment>
  );
}

function MA_ProductAdd() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="添加商品" right="保存" />
      <div className="pbody scroll">
        <Box><div className="label">主图 / 详情图</div>
          <div className="row" style={{gap:4, marginTop:4, flexWrap:"wrap"}}>
            <Img h={48} style={{width:48}} label="+"/>
            <Img h={48} style={{width:48}} x label=" "/>
            <Img h={48} style={{width:48}} x label=" "/>
            <Img h={48} style={{width:48}} x label=" "/>
          </div>
        </Box>
        <Box><div className="label">商品名称</div><div className="muted tiny">输入名称…</div></Box>
        <Box><div className="label">商品分类</div><div className="muted tiny">家具 › 餐桌 ›</div></Box>
        <Box><div className="label">厂家分类(自定义)</div><div className="muted tiny">北欧系列 ›</div></Box>
        <Box><div className="label">规格 SKU</div>
          <div className="grid2" style={{marginTop:3}}>
            <Tag>1.2m</Tag><Tag>1.4m</Tag><Tag>橡木</Tag><Tag tone="dark">+ 新增</Tag>
          </div>
        </Box>
        <Box className="fill">
          <div className="label">价格等级</div>
          <table className="tbl dashed" style={{marginTop:4, fontSize:10}}>
            <tbody>
              <tr><td>批发价</td><td>¥980</td></tr>
              <tr><td>零售价</td><td>¥1,288</td></tr>
              <tr><td>会员价</td><td>¥1,180</td></tr>
            </tbody>
          </table>
        </Box>
        <Box>
          <div className="label">价格显示规则</div>
          <div className="col tiny" style={{marginTop:3, gap:3}}>
            <div>● 未登录 — 不显示价格</div>
            <div>● 普通客户 — 显示零售价</div>
            <div>● 门店(申请通过) — 显示批发价</div>
          </div>
        </Box>
        <Btn block tone="primary" lg>保存并上架</Btn>
      </div>
    </React.Fragment>
  );
}

function MA_Category() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="分类管理" right="＋" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["一级分类","二级分类","厂家分类"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {[
          ["家具",["餐桌","椅子","沙发","床"]],
          ["灯具",["吊灯","台灯"]],
          ["布艺",["窗帘","地毯"]],
        ].map(([p, ch])=>(
          <Box key={p}>
            <div className="row between" style={{fontSize:11, fontWeight:700}}>
              <span>▾ {p}</span>
              <span className="tiny muted">⋮⋮ 拖拽 · 编辑</span>
            </div>
            <div style={{paddingLeft:12, marginTop:4}}>
              {ch.map(c=>(
                <div key={c} className="row between" style={{padding:"3px 0", fontSize:10, borderBottom:"1px dashed var(--line-soft)"}}>
                  <span>· {c}</span>
                  <span className="tiny muted">⋮⋮</span>
                </div>
              ))}
            </div>
          </Box>
        ))}
        <Btn block sq>＋ 新增一级分类</Btn>
      </div>
    </React.Fragment>
  );
}

function MA_OrderList() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="订单管理" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10, overflow:"hidden"}}>
        {["全部","待处理","已发货","已完成","售后"].map((t,i)=><Tag key={t} tone={i===1?"accent":""}>{t}</Tag>)}
      </div>
      <div style={{padding:"0 8px 4px"}}><div className="search-bar">🔍<span className="placeholder">订单号 / 客户</span></div></div>
      <div className="pbody scroll">
        {[
          ["#18202981","张先生","待发货"],
          ["#18202980","李女士","待发货"],
          ["#18202979","王先生","已发货"],
        ].map(([no, c, st])=>(
          <Box key={no}>
            <div className="row between" style={{fontSize:10}}>
              <span>{no} · {c}</span>
              <Tag tone={st==="待发货"?"accent":"pop"}>{st}</Tag>
            </div>
            <div className="row" style={{gap:6, marginTop:4}}>
              <Img h={44} style={{width:44, flex:"0 0 44px"}} x label=" "/>
              <div style={{flex:1, fontSize:10}}>
                <div>实木餐桌 ×1</div>
                <div className="muted tiny">¥1,288 · 朝阳区xx路</div>
              </div>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>详情</Btn>
              {st==="待发货" && <Btn tone="primary">发货</Btn>}
              {st==="已发货" && <Btn>查物流</Btn>}
            </div>
          </Box>
        ))}
      </div>
      <TabBar items={["首页","商品","订单","数据","我的"]} active={2} />
    </React.Fragment>
  );
}

function MA_OrderDetail() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="订单详情" right="···" />
      <div className="pbody scroll">
        <Box className="dashed">
          <div className="row between"><b style={{fontSize:11}}>待发货</b><span className="tiny muted">14:52 后自动关闭</span></div>
          <div className="tiny muted">订单号 #18202981 · 2025-05-11 09:21</div>
        </Box>
        <Box>
          <div className="row between" style={{fontSize:11, fontWeight:700}}><span>📍 收货信息</span><span className="tiny" style={{color:"var(--accent)"}}>🪄 一键识别</span></div>
          <div className="tiny" style={{marginTop:2}}>张先生 138****8888</div>
          <div className="tiny muted">北京市朝阳区xx路88号</div>
          <Box className="fill" style={{marginTop:6}}>
            <div className="tiny muted">粘贴地址自动解析 ›</div>
          </Box>
        </Box>
        <Box>
          <div className="row" style={{gap:6}}>
            <Img h={44} style={{width:44, flex:"0 0 44px"}} x label=" "/>
            <div style={{flex:1, fontSize:10}}>
              <div>实木餐桌 1.4m / 橡木</div>
              <div className="muted tiny">¥1,288 ×1</div>
            </div>
          </div>
        </Box>
        <Box className="fill">
          <table className="tbl dashed">
            <tbody>
              <tr><td>商品合计</td><td style={{textAlign:"right"}}>¥1,288</td></tr>
              <tr><td>运费</td><td style={{textAlign:"right"}}>¥0</td></tr>
              <tr><td>优惠</td><td style={{textAlign:"right", color:"var(--accent)"}}>-¥50</td></tr>
              <tr><td><b>实付</b></td><td style={{textAlign:"right",color:"var(--accent)",fontWeight:700}}>¥1,238</td></tr>
            </tbody>
          </table>
        </Box>
      </div>
      <div style={{height:42, flex:"0 0 42px", borderTop:"1.4px solid var(--ink)", display:"flex", alignItems:"center", padding:"0 8px", gap:6, background:"var(--paper-2)"}}>
        <Btn>打印</Btn>
        <Btn>备注</Btn>
        <Btn tone="primary" lg>发货</Btn>
      </div>
    </React.Fragment>
  );
}

function MA_Aftersale() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="售后处理" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["待处理","处理中","已完成"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {[1,2].map(i=>(
          <Box key={i}>
            <div className="row between" style={{fontSize:10}}>
              <span>退款单 #RF20290{i}</span><Tag tone="accent">退款退货</Tag>
            </div>
            <div className="row" style={{gap:6, marginTop:4}}>
              <Img h={40} style={{width:40, flex:"0 0 40px"}} x label=" "/>
              <div style={{flex:1, fontSize:10}}>
                <div>实木餐桌 ×1 · ¥1,288</div>
                <div className="muted tiny">原因：商品损坏</div>
              </div>
            </div>
            <Box className="fill" style={{marginTop:6}}>
              <div className="tiny"><b>退货地址：</b>北京朝阳望京xxx</div>
              <div className="tiny muted">客户提交凭证 3 张</div>
            </Box>
            <div className="row" style={{justifyContent:"flex-end", gap:4, marginTop:4}}>
              <Btn>拒绝</Btn>
              <Btn>协商</Btn>
              <Btn tone="primary">同意退款</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function MA_Customers() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="客户管理" right="＋" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10, overflow:"hidden"}}>
        {["普通客户","分佣客户","佣金设置","提现","预约"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <Box className="fill" style={{margin:"4px 8px"}}>
        <div className="row between tiny">
          <span>🟢 申请注册为门店 / 平台授权开放</span>
          <span style={{color:"var(--accent)"}}>开</span>
        </div>
      </Box>
      <div className="pbody scroll">
        {["张先生","李女士","王同学","赵阿姨"].map((n,i)=>(
          <Box key={n}>
            <div className="row" style={{gap:6}}>
              <div className="avatar">{n[0]}</div>
              <div style={{flex:1, fontSize:10}}>
                <div className="row between"><b>{n}</b><Tag tone={i===0?"pop":""}>{i===0?"门店":"普通"}</Tag></div>
                <div className="muted tiny">138****88{i}{i} · 北京</div>
                <div className="tiny">订单 {12+i} 单 · 累计 ¥{(i+1)*1280}</div>
              </div>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>价格权限</Btn>
              <Btn>详情</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function MA_Commission() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="佣金设置" right="保存" />
      <div className="pbody scroll">
        <Box>
          <div className="row between" style={{fontSize:11}}>
            <b>开启分佣</b><span className="tag accent">已开启</span>
          </div>
        </Box>
        <Box>
          <div className="label">默认佣金比例</div>
          <div className="row" style={{gap:6, marginTop:3}}>
            <Box className="dashed" style={{flex:1, textAlign:"center", padding:6}}>一级 <b style={{color:"var(--accent)"}}>10%</b></Box>
            <Box className="dashed" style={{flex:1, textAlign:"center", padding:6}}>二级 <b style={{color:"var(--accent)"}}>3%</b></Box>
          </div>
        </Box>
        <Box>
          <div className="label">佣金可见</div>
          <div className="row tiny" style={{gap:6, marginTop:4}}>
            <Tag tone="accent">分佣客户可见</Tag>
            <Tag>普通客户不可见</Tag>
          </div>
        </Box>
        <Box>
          <div className="label">线下交易</div>
          <div className="row between tiny" style={{marginTop:4}}>
            <span>允许分佣客户线下结算</span>
            <span>● 开</span>
          </div>
        </Box>
        <Box className="fill">
          <div className="label">按商品自定义佣金</div>
          <table className="tbl dashed" style={{marginTop:4}}>
            <thead><tr><th>商品</th><th>比例</th><th></th></tr></thead>
            <tbody>
              <tr><td>餐桌</td><td>12%</td><td>编辑</td></tr>
              <tr><td>沙发</td><td>15%</td><td>编辑</td></tr>
            </tbody>
          </table>
        </Box>
      </div>
    </React.Fragment>
  );
}

function MA_Withdraw() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="提现处理" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["待审核","已通过","已驳回"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {[1,2,3].map(i=>(
          <Box key={i}>
            <div className="row between" style={{fontSize:10}}>
              <span>申请 #W2090{i}</span><b style={{color:"var(--accent)", fontSize:13}}>¥{i*120}.00</b>
            </div>
            <div className="row" style={{gap:6, marginTop:4}}>
              <div className="avatar sm">{"张李王"[i-1]}</div>
              <div style={{flex:1, fontSize:10}}>
                <div>{["张分佣","李分佣","王分佣"][i-1]}</div>
                <div className="muted tiny">微信 · 138****8{i}8{i}</div>
              </div>
            </div>
            <HL dashed />
            {/* 可修改佣金金额 + 备注 */}
            <div className="col" style={{gap:4}}>
              <div className="row" style={{gap:6, alignItems:"center"}}>
                <span className="tiny muted" style={{width:48}}>调整金额</span>
                <span style={{flex:1, border:"1.3px solid var(--ink)", borderRadius:4, padding:"3px 6px", fontSize:11, display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--card)"}}>
                  <span style={{color:"var(--accent)", fontWeight:700}}>¥ {i*120}.00</span>
                  <span className="row" style={{gap:0, fontSize:10}}>
                    <span style={{padding:"0 6px", border:"1px solid var(--ink)", borderRadius:3}}>−</span>
                    <span style={{padding:"0 6px", border:"1px solid var(--ink)", borderRadius:3, marginLeft:3}}>+</span>
                  </span>
                </span>
              </div>
              <div className="row" style={{gap:6, alignItems:"flex-start"}}>
                <span className="tiny muted" style={{width:48, paddingTop:4}}>备注</span>
                <div style={{flex:1, border:"1.3px dashed var(--ink)", borderRadius:4, padding:"4px 6px", minHeight:30, fontSize:10, color:"var(--muted)", fontStyle:"italic", background:"var(--paper-2)"}}>
                  {i===1?"已核对订单，金额无误":"填写驳回原因或扣减说明…"}
                </div>
              </div>
              <div className="row" style={{gap:4, fontSize:9}}>
                <span className="tag">扣减税费</span>
                <span className="tag">非订单佣金</span>
                <span className="tag">客户违规</span>
                <span className="tag dark">＋ 自定义</span>
              </div>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>驳回</Btn>
              <Btn tone="primary">通过</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function MA_Stores() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="门店管理" right="＋" />
      <Box className="fill" style={{margin:"4px 8px"}}>
        <div className="row between tiny">
          <span>🟢 申请注册为厂家 / 平台授权开放</span><span style={{color:"var(--accent)"}}>开</span>
        </div>
      </Box>
      <div className="row" style={{padding:"0 8px 4px", gap:6, fontSize:10}}>
        {["全部门店","已授权","待审核","已取消"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {[
          ["望京旗舰店","A级","138****0001"],
          ["国贸店","B级","138****0002"],
          ["顺义店","B级","138****0003"],
        ].map(([n, lv, ph])=>(
          <Box key={n}>
            <div className="row" style={{gap:6}}>
              <div className="avatar">🏪</div>
              <div style={{flex:1, fontSize:10}}>
                <div className="row between"><b>{n}</b><Tag tone={lv==="A级"?"accent":"pop"}>{lv}</Tag></div>
                <div className="muted tiny">📍 朝阳区xx · 📞 {ph}</div>
              </div>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>授权设置</Btn>
              <Btn>数据</Btn>
              <Btn tone="dark">取消授权</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function MA_StoreAuth() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="门店授权设置" right="保存" />
      <div className="pbody scroll">
        <Box>
          <div className="row between"><b style={{fontSize:11}}>望京旗舰店</b><Tag tone="accent">已授权</Tag></div>
          <div className="muted tiny">授权有效期：2025-05-01 → 2026-05-01 ›</div>
        </Box>
        <Box>
          <div className="label">门店等级</div>
          <div className="row" style={{gap:4, marginTop:3}}>
            {["A","B","C"].map(l=><Tag key={l} tone={l==="A"?"accent":""}>{l} 级</Tag>)}
          </div>
        </Box>
        <Box>
          <div className="label">可查看价格</div>
          <div className="col tiny" style={{gap:3, marginTop:3}}>
            <div>● 批发价</div>
            <div>● 零售价</div>
            <div>○ 会员价</div>
          </div>
        </Box>
        <Box>
          <div className="label">可上架商品</div>
          <table className="tbl dashed">
            <thead><tr><th></th><th>分类</th><th>加价</th></tr></thead>
            <tbody>
              <tr><td>●</td><td>家具 / 餐桌</td><td>+5%</td></tr>
              <tr><td>●</td><td>家具 / 沙发</td><td>+8%</td></tr>
              <tr><td>○</td><td>灯具</td><td>—</td></tr>
            </tbody>
          </table>
        </Box>
      </div>
    </React.Fragment>
  );
}

function MA_Staff() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="员工管理" right="＋邀请" />
      <div className="row" style={{padding:"6px 8px", gap:6, fontSize:10}}>
        {["员工列表","业绩","权限"].map((t,i)=><Tag key={t} tone={i===0?"accent":""}>{t}</Tag>)}
      </div>
      <div className="pbody scroll">
        {["小赵 · 客服","小钱 · 销售","小孙 · 销售"].map((n,i)=>(
          <Box key={n}>
            <div className="row" style={{gap:6}}>
              <div className="avatar">{n[0]}</div>
              <div style={{flex:1, fontSize:10}}>
                <div className="row between"><b>{n}</b><Tag tone="pop">在职</Tag></div>
                <div className="muted tiny">本月业绩 ¥{(i+1)*8200}</div>
              </div>
            </div>
            <HL dashed />
            <div className="row" style={{justifyContent:"flex-end", gap:4}}>
              <Btn>权限</Btn>
              <Btn>数据连通</Btn>
              <Btn>业绩</Btn>
            </div>
          </Box>
        ))}
      </div>
    </React.Fragment>
  );
}

function MA_Shop() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="店铺装修" right="预览" />
      <div className="pbody scroll">
        <Box className="dashed">
          <div className="label">主题色</div>
          <div className="row" style={{gap:6, marginTop:4}}>
            {["#e85d2e","#2c6fb5","#1a8a5b","#7a3fa3","#1a1a1a"].map(c=>(
              <span key={c} className="swatch" style={{background:c, width:22, height:22}}></span>
            ))}
          </div>
        </Box>
        <Box className="dashed">
          <div className="label">字体风格</div>
          <div className="row" style={{gap:6, marginTop:4}}>
            <Tag tone="accent">现代</Tag><Tag>典雅</Tag><Tag>俏皮</Tag>
          </div>
        </Box>
        <Box className="dashed">
          <div className="label">轮播图</div>
          <div className="grid3" style={{gap:4, marginTop:4}}>
            <Img h={40} x label=" "/><Img h={40} x label=" "/><Img h={40} label="+"/>
          </div>
        </Box>
        <Box className="dashed">
          <div className="label">显示风格</div>
          <div className="row" style={{gap:6, marginTop:4}}>
            <Tag tone="accent">瀑布流</Tag><Tag>双列</Tag><Tag>单列大图</Tag>
          </div>
        </Box>
        <Box>
          <div className="label">实时预览</div>
          <div style={{height:90, border:"1.4px solid var(--ink)", borderRadius:6, marginTop:4, background:"var(--paper-2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Caveat, cursive", color:"var(--muted)"}}>店铺首页预览</div>
        </Box>
      </div>
    </React.Fragment>
  );
}

function MA_Marketing() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="营销中心" />
      <div className="pbody scroll">
        {[
          ["🎟️","优惠券管理","创建 / 编辑 / 数据"],
          ["⚡","限时限量购","设置抢购时段"],
          ["👥","团购管理","拼团 · N 人成团"],
        ].map(([ic,t,d])=>(
          <Box key={t} className="dashed">
            <div className="row between">
              <div className="row" style={{gap:8}}>
                <div style={{fontSize:20}}>{ic}</div>
                <div><div style={{fontWeight:700, fontSize:12}}>{t}</div><div className="muted tiny">{d}</div></div>
              </div>
              <Btn>进入</Btn>
            </div>
          </Box>
        ))}
        <Box>
          <div className="label">优惠券列表</div>
          <table className="tbl dashed">
            <thead><tr><th>名称</th><th>面额</th><th>状态</th></tr></thead>
            <tbody>
              <tr><td>新客券</td><td>50减5</td><td>进行中</td></tr>
              <tr><td>满减</td><td>800减80</td><td>已结束</td></tr>
            </tbody>
          </table>
        </Box>
      </div>
    </React.Fragment>
  );
}

function MA_Chat() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="在线客服" sub="张先生 · 在线" right="···" />
      <div className="pbody scroll" style={{background:"var(--paper-2)", gap:8}}>
        <div className="tiny muted" style={{textAlign:"center"}}>14:21</div>
        <div className="row" style={{alignItems:"flex-start", gap:6}}>
          <div className="avatar sm">张</div>
          <div style={{maxWidth:"75%", padding:"6px 10px", background:"var(--card)", border:"1.3px solid var(--ink)", borderRadius:"10px 10px 10px 2px", fontSize:11}}>这个餐桌有现货吗？</div>
        </div>
        <div className="row" style={{justifyContent:"flex-end", gap:6}}>
          <div style={{maxWidth:"75%", padding:"6px 10px", background:"var(--accent)", color:"white", border:"1.3px solid var(--ink)", borderRadius:"10px 10px 2px 10px", fontSize:11}}>您好，1.4米现货 12 张，48 小时内发出 ✨</div>
          <div className="avatar sm">我</div>
        </div>
        <div className="row" style={{alignItems:"flex-start", gap:6}}>
          <div className="avatar sm">张</div>
          <div style={{maxWidth:"75%", padding:"6px 10px", background:"var(--card)", border:"1.3px solid var(--ink)", borderRadius:"10px 10px 10px 2px", fontSize:11}}>能不能再便宜点？</div>
        </div>
        <Box className="fill" style={{padding:4}}>
          <div className="tiny muted">⚡ 快捷回复</div>
          <div className="row" style={{gap:4, marginTop:3, flexWrap:"wrap"}}>
            <Tag>欢迎语</Tag><Tag>发货说明</Tag><Tag>优惠券</Tag>
          </div>
        </Box>
      </div>
      <div style={{height:40, flex:"0 0 40px", borderTop:"1.4px solid var(--ink)", display:"flex", alignItems:"center", padding:"0 8px", gap:6, background:"var(--card)"}}>
        <span style={{fontSize:16}}>＋</span>
        <div className="search-bar" style={{flex:1}}><span className="placeholder">输入消息…</span></div>
        <span style={{fontSize:16}}>😊</span>
      </div>
    </React.Fragment>
  );
}

function MA_Me() {
  return (
    <React.Fragment>
      <StatusBar />
      <div className="pbody scroll no-pad" style={{padding:0}}>
        <div style={{background:"var(--paper-2)", padding:"20px 12px 14px", borderBottom:"1.4px solid var(--ink)", display:"flex", gap:10, alignItems:"center"}}>
          <div className="avatar lg" style={{background:"var(--accent)", color:"white"}}>九</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:13}}>经纬科技</div>
            <div className="tiny muted">商户号 M10283</div>
            <div className="row" style={{gap:4, marginTop:3}}>
              <Tag tone="accent">VIP · 年费</Tag>
              <Tag>剩余 287 天</Tag>
            </div>
          </div>
        </div>
        <Box className="fill" style={{margin:8, borderColor:"var(--accent)"}}>
          <div className="row between">
            <div>
              <div style={{fontWeight:700, fontSize:12}}>会员开通</div>
              <div className="muted tiny">月费 ¥99 / 年费 ¥899 · 试用 30 天</div>
            </div>
            <Btn tone="primary">续费 / 升级</Btn>
          </div>
        </Box>
        <div style={{padding:"0 0 8px"}}>
          {[
            ["📤","分享小程序"],
            ["👤","个人信息"],
            ["⚙️","系统设置"],
            ["🔄","检查更新"],
            ["💬","联系我们"],
          ].map(([ic,t])=>(
            <div key={t} className="row between" style={{padding:"10px 14px", borderBottom:"1px dashed var(--line-soft)", fontSize:11}}>
              <span>{ic} {t}</span><span className="muted">›</span>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={["首页","商品","订单","数据","我的"]} active={4} />
    </React.Fragment>
  );
}

function MA_Member() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="会员开通" />
      <div className="pbody scroll">
        <div style={{textAlign:"center", padding:"6px 0"}}>
          <div style={{fontFamily:"ZCOOL KuaiLe", fontSize:18}}>解锁全部商家功能</div>
          <div className="tiny muted">商品管理 · 门店授权 · 销售授权 · 客户授权</div>
        </div>
        <Box className="dashed" style={{borderColor:"var(--accent)"}}>
          <div className="row between"><b>年费会员</b><Tag tone="accent">推荐</Tag></div>
          <div style={{fontSize:22, fontWeight:700, color:"var(--accent)"}}>¥899 <span className="tiny muted" style={{textDecoration:"line-through"}}>¥1,188</span></div>
          <div className="tiny muted">折合 ¥2.5 / 天</div>
        </Box>
        <Box className="dashed">
          <div className="row between"><b>月费会员</b></div>
          <div style={{fontSize:22, fontWeight:700}}>¥99</div>
          <div className="tiny muted">按月续费</div>
        </Box>
        <Box className="fill">
          <div className="label">已包含权益</div>
          <div className="col tiny" style={{gap:2, marginTop:3}}>
            <div>✓ 商品管理 / 上架</div>
            <div>✓ 门店申请授权</div>
            <div>✓ 销售员授权</div>
            <div>✓ 客户授权 / 价格分级</div>
            <div>✓ 数据统计</div>
          </div>
        </Box>
        <Btn block tone="primary" lg>立即开通</Btn>
        <div className="tiny muted" style={{textAlign:"center"}}>开通即同意《会员服务协议》</div>
      </div>
    </React.Fragment>
  );
}

function MA_Plaza() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="选品广场" right="🔍" />
      <div className="pbody scroll">
        {/* 顶部搜索 */}
        <div className="row" style={{gap:4}}>
          <div style={{flex:1}}><Input placeholder="搜索商品 / 厂家名称" sq /></div>
          <Btn>筛选</Btn>
        </div>
        {/* Tab 切换 商品 / 厂家 */}
        <div className="row" style={{borderBottom:"1.2px solid var(--ink)", gap:0}}>
          <div style={{flex:1, textAlign:"center", padding:"5px 0", fontSize:11, fontWeight:700, borderBottom:"3px solid var(--accent)"}}>推荐商品</div>
          <div style={{flex:1, textAlign:"center", padding:"5px 0", fontSize:11, color:"var(--muted)"}}>推荐厂家</div>
          <div style={{flex:1, textAlign:"center", padding:"5px 0", fontSize:11, color:"var(--muted)"}}>我的代理</div>
        </div>
        {/* 横向标签 */}
        <div style={{display:"flex", gap:5, overflowX:"auto", scrollbarWidth:"none"}}>
          {["全部","🔥本周热推","新品","厂家直供","高佣金","限时"].map((t,i)=>(
            <span key={t} className="tag" style={i===0?{background:"var(--accent)", color:"#fff", borderColor:"var(--accent)"}:{}}>{t}</span>
          ))}
        </div>
        {/* 商品瀑布流 */}
        <div className="grid2" style={{gap:6}}>
          {[1,2,3,4,5,6].map(i=>(
            <Box key={i} style={{padding:4, position:"relative"}}>
              {i<=2 && <span style={{position:"absolute", top:4, left:4, background:"var(--accent)", color:"#fff", fontSize:8, padding:"1px 4px", borderRadius:2, zIndex:2}}>平台推送</span>}
              <Img h={80} label=" " />
              <div style={{fontSize:10, marginTop:3, fontWeight:600}}>实木真皮沙发 {i}</div>
              <div className="tiny muted" style={{marginTop:1}}>厂家：经纬科技 · 已代理 128</div>
              <div className="row between" style={{marginTop:3}}>
                <div>
                  <span style={{color:"var(--accent)", fontWeight:700, fontSize:11}}>¥{1280+i*120}</span>
                  <span className="tiny muted"> 起</span>
                </div>
                <Btn tone="primary">代理</Btn>
              </div>
              <div className="tiny" style={{color:"var(--accent-2)", marginTop:2}}>建议加价 ¥200~500 · 佣金 8%</div>
            </Box>
          ))}
        </div>
        <div className="tiny muted" style={{textAlign:"center"}}>— 上拉加载更多 —</div>
      </div>
    </React.Fragment>
  );
}

function MA_PlazaFactory() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="厂家详情" right="⋯" />
      <div className="pbody scroll">
        <Box>
          <div className="row" style={{gap:8}}>
            <Img h={48} solid style={{width:48, flex:"0 0 48px"}} label="LOGO" />
            <div style={{flex:1}}>
              <div style={{fontWeight:700, fontSize:13}}>经纬科技 <Tag tone="accent">平台推荐</Tag></div>
              <div className="tiny muted" style={{marginTop:2}}>主营：实木家具 · 真皮沙发 · 软包床</div>
              <div className="tiny" style={{marginTop:2}}>📍 广东佛山 · 合作门店 386 家</div>
            </div>
          </div>
          <div className="row between" style={{marginTop:6, gap:4}}>
            <Btn block tone="primary">申请代理</Btn>
            <Btn block>联系厂家</Btn>
            <Btn block>关注</Btn>
          </div>
        </Box>
        <Box>
          <div className="row between"><b style={{fontSize:11}}>资质 / 等级</b><span className="tiny" style={{color:"var(--accent-2)"}}>★★★★★</span></div>
          <div className="tiny" style={{marginTop:3}}>· 营业执照已认证 · 工厂实拍已审核</div>
          <div className="tiny">· 平台合作 3 年 · 信用 A</div>
        </Box>
        <div style={{fontSize:11, fontWeight:700}}>厂家商品 · 共 86 款</div>
        <div className="grid2" style={{gap:6}}>
          {[1,2,3,4].map(i=>(
            <Box key={i} style={{padding:4}}>
              <Img h={70} label=" " />
              <div style={{fontSize:10, marginTop:2}}>商品 {i}</div>
              <div className="row between" style={{marginTop:2}}>
                <span style={{color:"var(--accent)", fontWeight:700, fontSize:10}}>¥{980+i*100}</span>
                <Btn>代理</Btn>
              </div>
            </Box>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

function MAScreens() {
  return (
    <Role id="merchant-app" num="02" title="商家后台 · APP端" en="Merchant / Mobile" desc="商家(厂家或门店)随时随地管理：商品、订单、客户、门店授权、员工授权、店铺装修、营销、客服、会员。">
      <Sub title="首页 · 数据 · 我的">
        <div className="phone-row">
          <Phone idx="01" title="商家首页"><MA_Home /></Phone>
          <Phone idx="02" title="数据统计"><MA_Stats /></Phone>
          <Phone idx="03" title="我的 (会员状态)"><MA_Me /></Phone>
          <Phone idx="04" title="会员套餐开通"><MA_Member /></Phone>
        </div>
      </Sub>
      <Sub title="商品 · 添加 / 分类">
        <div className="phone-row">
          <Phone idx="05" title="商品列表"><MA_ProductList /></Phone>
          <Phone idx="06" title="添加商品"><MA_ProductAdd /></Phone>
          <Phone idx="07" title="分类管理(树形拖拽)"><MA_Category /></Phone>
        </div>
      </Sub>
      <Sub title="订单 · 售后">
        <div className="phone-row">
          <Phone idx="08" title="订单列表"><MA_OrderList /></Phone>
          <Phone idx="09" title="订单详情(一键识别地址)"><MA_OrderDetail /></Phone>
          <Phone idx="10" title="售后处理"><MA_Aftersale /></Phone>
        </div>
      </Sub>
      <Sub title="客户 · 分佣 · 提现">
        <div className="phone-row">
          <Phone idx="11" title="客户管理"><MA_Customers /></Phone>
          <Phone idx="12" title="佣金设置"><MA_Commission /></Phone>
          <Phone idx="13" title="提现处理"><MA_Withdraw /></Phone>
        </div>
      </Sub>
      <Sub title="门店 · 员工授权">
        <div className="phone-row">
          <Phone idx="14" title="门店列表"><MA_Stores /></Phone>
          <Phone idx="15" title="门店授权设置"><MA_StoreAuth /></Phone>
          <Phone idx="16" title="员工管理"><MA_Staff /></Phone>
        </div>
      </Sub>
      <Sub title="店铺装修 · 营销 · 客服">
        <div className="phone-row">
          <Phone idx="17" title="店铺装修"><MA_Shop /></Phone>
          <Phone idx="18" title="营销中心"><MA_Marketing /></Phone>
          <Phone idx="19" title="在线客服"><MA_Chat /></Phone>
        </div>
      </Sub>
      <Sub title="选品广场 (平台推送)">
        <div className="phone-row">
          <Phone idx="20" title="选品广场 · 商品 / 厂家"><MA_Plaza /></Phone>
          <Phone idx="21" title="厂家详情 · 申请代理"><MA_PlazaFactory /></Phone>
        </div>
      </Sub>
    </Role>
  );
}

window.MAScreens = MAScreens;
