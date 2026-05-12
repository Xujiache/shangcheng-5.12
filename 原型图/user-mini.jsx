// User end - WeChat mini program screens (mobile)

function UM_Home() {
  return (
    <React.Fragment>
      <StatusBar />
      <div style={{padding:"6px 10px 4px", display:"flex", alignItems:"center", gap:8, borderBottom:"1.2px dashed var(--line-soft)"}}>
        <div className="avatar sm" style={{background:"var(--accent)"}}>L</div>
        <div style={{flex:1, fontWeight:700, fontSize:13}}>经纬科技</div>
        <span style={{fontSize:14}}>···</span>
      </div>
      <div className="pbody scroll">
        <div className="search-bar">🔍<span className="placeholder">搜索商品 / 店铺</span></div>
        <Img h={92} label="平台广告 · 轮播 1/3" />
        <div style={{display:"flex", gap:4, justifyContent:"center", margin:"-2px 0 2px"}}>
          <span style={{width:10, height:3, background:"var(--accent)", borderRadius:2}}></span>
          <span style={{width:5, height:3, background:"var(--line-soft)", borderRadius:2}}></span>
          <span style={{width:5, height:3, background:"var(--line-soft)", borderRadius:2}}></span>
        </div>
        <div className="grid4" style={{gap:4}}>
          {["新品","上新","活动","会员"].map(t=>(
            <div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:9}}>
              <div style={{width:28,height:28,border:"1.4px solid var(--ink)", borderRadius:8, background:"var(--paper-2)"}}></div>
              {t}
            </div>
          ))}
        </div>
        <div style={{fontSize:11, fontWeight:700, margin:"4px 0 2px"}}>瀑布流 · 为你推荐</div>
        <div className="waterfall">
          {[1,2,3,4].map(i=>(
            <div key={i} className="wf-card">
              <Img h={i%2?70:90} x label=" " />
              <div className="info">
                <div>实木餐桌 北欧风</div>
                <div className="row between">
                  <span className="price">¥ 1,2xx</span>
                  <Tag>登录可见</Tag>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={["首页","分类","购物车","我的"]} active={0} />
    </React.Fragment>
  );
}

function UM_Detail() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="商品详情" right="···" />
      <div className="pbody scroll">
        <Img h={140} label="商品主图轮播 1/5" />
        <div className="row between" style={{fontSize:11}}>
          <span style={{color:"var(--accent)", fontWeight:700, fontSize:16}}>¥ 1,288</span>
          <Tag tone="pop">门店价 · 申请可见</Tag>
        </div>
        <div style={{fontSize:12, fontWeight:600}}>实木北欧餐桌 1.4米 原木色</div>
        <div style={{fontSize:10, color:"var(--muted)"}}>已售 320 · 评论 86 · 厂家直发</div>
        <HL dashed />
        <div style={{fontSize:11, fontWeight:600}}>规格选择</div>
        <div className="row" style={{flexWrap:"wrap", gap:4}}>
          {["1.2m","1.4m","1.6m","橡木","胡桃木"].map(s=>(
            <Tag key={s} tone={s==="1.4m"?"accent":""}>{s}</Tag>
          ))}
        </div>
        <HL dashed />
        <div style={{fontSize:11, fontWeight:600}}>商品详情</div>
        <Img h={50} label="图文详情区" />
        <Img h={50} label="参数表格" />
      </div>
      <div style={{height:48, flex:"0 0 48px", borderTop:"1.4px solid var(--ink)", display:"flex", alignItems:"center", padding:"0 6px", gap:6, background:"var(--card)"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:10, width:42, gap:1}}>
          <span style={{fontSize:16, lineHeight:1}}>★</span>
          <span>收藏</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:10, width:42, gap:1}}>
          <span style={{fontSize:16, lineHeight:1}}>💬</span>
          <span>客服</span>
        </div>
        <span style={{display:"inline-flex", flex:1, alignItems:"center", justifyContent:"center", padding:"6px 6px", border:"1.4px solid var(--ink)", background:"#ffb84d", color:"var(--ink)", fontSize:10, fontWeight:600, borderRadius:"16px 0 0 16px"}}>加入购物车</span>
        <span style={{display:"inline-flex", flex:1, alignItems:"center", justifyContent:"center", padding:"6px 6px", border:"1.4px solid var(--ink)", background:"var(--accent)", color:"white", fontSize:10, fontWeight:600, borderRadius:"0 16px 16px 0", marginLeft:-6}}>立即购买</span>
      </div>
    </React.Fragment>
  );
}

function UM_Confirm() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="确认订单" />
      <div className="pbody scroll">
        <Box className="dashed">
          <div className="row between"><b style={{fontSize:11}}>📍 收货地址</b><span style={{fontSize:10, color:"var(--accent)"}}>更换 ›</span></div>
          <div style={{fontSize:10, marginTop:2}}>张先生 138****8888</div>
          <div style={{fontSize:10, color:"var(--muted)"}}>北京市朝阳区xxx路88号</div>
        </Box>
        <Box>
          <div className="row" style={{gap:6}}>
            <Img h={50} style={{width:50, flex:"0 0 50px"}} x label=" "/>
            <div style={{flex:1, fontSize:10}}>
              <div>实木餐桌 1.4m 橡木</div>
              <div className="row between"><span style={{color:"var(--accent)",fontWeight:700}}>¥1,288</span><span>×1</span></div>
            </div>
          </div>
        </Box>
        <Box className="fill">
          <div className="row between" style={{fontSize:10}}><span>配送方式</span><span>厂家直发 ›</span></div>
          <div className="row between" style={{fontSize:10, marginTop:4}}><span>优惠券</span><span style={{color:"var(--accent)"}}>-¥50 ›</span></div>
          <div className="row between" style={{fontSize:10, marginTop:4}}><span>备注</span><span style={{color:"var(--muted)"}}>选填…</span></div>
        </Box>
      </div>
      <div style={{height:46, flex:"0 0 46px", borderTop:"1.4px solid var(--ink)", display:"flex", alignItems:"center", padding:"0 8px", gap:8, background:"var(--paper-2)"}}>
        <span style={{fontSize:11}}>合计 <b style={{color:"var(--accent)", fontSize:14}}>¥1,238</b></span>
        <Btn tone="primary" lg>提交订单</Btn>
      </div>
    </React.Fragment>
  );
}

function UM_Pay() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="支付" />
      <div className="pbody scroll" style={{alignItems:"center"}}>
        <div style={{textAlign:"center", padding:"12px 0 8px"}}>
          <div style={{fontSize:10, color:"var(--muted)"}}>订单金额</div>
          <div style={{fontSize:28, fontWeight:700, color:"var(--accent)"}}>¥1,238.00</div>
          <div style={{fontSize:9, color:"var(--muted)"}}>剩余支付时间 14:52</div>
        </div>
        <Box className="dashed" style={{width:"100%"}}>
          <div className="row between" style={{fontSize:11}}>
            <span className="row" style={{gap:6}}><div className="swatch" style={{background:"#3cb244"}}></div>微信支付</span>
            <span>●</span>
          </div>
          <HL dashed />
          <div className="row between" style={{fontSize:11}}>
            <span className="row" style={{gap:6}}><div className="swatch" style={{background:"#1296db"}}></div>余额（¥0.00）</span>
            <span>○</span>
          </div>
        </Box>
        <Btn block tone="primary" lg>立即支付</Btn>
        <div style={{fontSize:9, color:"var(--muted)", textAlign:"center"}}>开通付款即同意《用户协议》</div>
      </div>
    </React.Fragment>
  );
}

function UM_Cat() {
  const L1 = ["家具","灯具","布艺","厨卫","摆件","建材","家电","定制"];
  const L2 = ["桌椅","沙发","床品","柜类","儿童","户外","收纳","书房"];
  return (
    <React.Fragment>
      <StatusBar />
      <div style={{padding:"6px 10px"}}><div className="search-bar">🔍<span className="placeholder">搜索商品</span></div></div>
      {/* 一级分类 · 横向滚动 */}
      <div style={{position:"relative"}}>
        <div style={{display:"flex", gap:14, padding:"0 10px 4px", overflowX:"auto", whiteSpace:"nowrap", scrollbarWidth:"none"}}>
          {L1.map((c,i)=>(
            <span key={c} style={{fontSize:12, fontWeight:i===0?700:400, color:i===0?"var(--accent)":"var(--ink)", borderBottom:i===0?"2px solid var(--accent)":"none", paddingBottom:2, flex:"0 0 auto"}}>{c}</span>
          ))}
          <span style={{fontSize:10, color:"var(--muted)", flex:"0 0 auto", alignSelf:"center"}}>›</span>
        </div>
      </div>
      <HL />
      {/* 二级分类 · 横向滚动 */}
      <div style={{display:"flex", gap:6, padding:"6px 10px", overflowX:"auto", whiteSpace:"nowrap", background:"var(--paper-2)", borderBottom:"1.2px dashed var(--line-soft)", scrollbarWidth:"none"}}>
        {L2.map((c,i)=>(
          <span key={c} style={{flex:"0 0 auto", padding:"3px 8px", fontSize:10, border:"1.2px solid "+(i===0?"var(--accent)":"var(--ink)"), borderRadius:12, background:i===0?"var(--accent)":"var(--card)", color:i===0?"white":"var(--ink)"}}>{c}</span>
        ))}
        <span style={{fontSize:10, color:"var(--muted)", flex:"0 0 auto", alignSelf:"center"}}>›</span>
      </div>
      <div style={{display:"flex", flex:1, overflow:"hidden"}}>
        <div style={{flex:1, padding:6, display:"flex", flexDirection:"column", gap:6, overflow:"auto"}}>
          <div style={{fontSize:10, fontWeight:700}}>家具 / 桌椅</div>
          <div className="waterfall">
            {[1,2,3,4].map(i=>(
              <div key={i} className="wf-card">
                <Img h={50} x label=" "/>
                <div className="info"><div>商品名</div><div className="price">¥9xx</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar items={["首页","分类","购物车","我的"]} active={1} />
    </React.Fragment>
  );
}

function UM_Cart() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar title="购物车" right="编辑" />
      <div className="pbody scroll">
        <div className="row" style={{padding:"4px 0", fontSize:10}}>
          <span style={{fontWeight:700}}>★ 我的收藏 (12)</span>
          <span style={{marginLeft:"auto", color:"var(--muted)"}}>查看全部 ›</span>
        </div>
        {/* 收藏 · 横向滚动 */}
        <div style={{display:"flex", gap:6, overflowX:"auto", padding:"2px 0 6px", scrollbarWidth:"none"}}>
          {[1,2,3,4,5].map(i=>(
            <div key={i} style={{flex:"0 0 88px", border:"1.3px solid var(--ink)", borderRadius:6, background:"var(--card)", overflow:"hidden", display:"flex", flexDirection:"column"}}>
              <div style={{position:"relative"}}>
                <Img h={60} x label=" " style={{borderRadius:0, border:"none", borderBottom:"1px solid var(--ink)"}}/>
                <span style={{position:"absolute", top:3, right:3, width:14, height:14, lineHeight:"12px", textAlign:"center", border:"1.2px solid var(--ink)", borderRadius:"50%", background:"var(--card)", fontSize:9}}>×</span>
              </div>
              <div style={{padding:"3px 4px", fontSize:9, lineHeight:1.2}}>
                <div style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>收藏品 {i}</div>
                <div style={{color:"var(--accent)", fontWeight:700}}>¥9{i}8</div>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", fontSize:8, borderTop:"1px solid var(--ink)"}}>
                <span style={{padding:"2px 0", textAlign:"center", borderRight:"1px solid var(--ink)", color:"var(--muted)"}}>取消</span>
                <span style={{padding:"2px 0", textAlign:"center", background:"var(--accent)", color:"white", fontWeight:600}}>加购</span>
              </div>
            </div>
          ))}
          <div style={{flex:"0 0 30px", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted)", fontSize:14}}>›</div>
        </div>
        <HL dashed />
        {[1,2,3].map(i=>(
          <Box key={i}>
            <div className="row" style={{gap:6}}>
              <span style={{fontSize:14}}>{i===1?"●":"○"}</span>
              <Img h={48} style={{width:48, flex:"0 0 48px"}} x label=" "/>
              <div style={{flex:1, fontSize:10}}>
                <div>商品名称 {i}</div>
                <div className="muted tiny">规格：1.4m / 橡木</div>
                <div className="row between" style={{marginTop:3}}>
                  <span style={{color:"var(--accent)", fontWeight:700}}>¥1,2{i}8</span>
                  <span className="row" style={{gap:0, border:"1.2px solid var(--ink)", borderRadius:3, fontSize:10}}>
                    <span style={{padding:"0 5px"}}>−</span>
                    <span style={{padding:"0 5px", borderLeft:"1px solid var(--ink)", borderRight:"1px solid var(--ink)"}}>1</span>
                    <span style={{padding:"0 5px"}}>+</span>
                  </span>
                </div>
              </div>
            </div>
          </Box>
        ))}
      </div>
      <div style={{height:42, flex:"0 0 42px", borderTop:"1.4px solid var(--ink)", display:"flex", alignItems:"center", padding:"0 8px", gap:6, background:"var(--paper-2)"}}>
        <span style={{fontSize:11}}>● 全选</span>
        <span style={{fontSize:10, marginLeft:"auto"}}>合计 <b style={{color:"var(--accent)", fontSize:13}}>¥2,476</b></span>
        <Btn tone="primary">去结算(2)</Btn>
      </div>
      <TabBar items={["首页","分类","购物车","我的"]} active={2} />
    </React.Fragment>
  );
}

function UM_Me_Logout() {
  return (
    <React.Fragment>
      <StatusBar />
      <div className="pbody scroll no-pad" style={{padding:0}}>
        <div style={{background:"var(--paper-2)", padding:"24px 12px 12px", display:"flex", gap:10, alignItems:"center", borderBottom:"1.4px solid var(--ink)"}}>
          <div className="avatar lg" style={{background:"var(--card)"}}>?</div>
          <div>
            <div style={{fontWeight:700, fontSize:13}}>未登录</div>
            <div style={{fontSize:10, color:"var(--muted)"}}>微信一键登录可查看零售价</div>
            <div style={{marginTop:6}}><Btn tone="primary">微信登录</Btn></div>
          </div>
        </div>
        <div style={{padding:"8px 10px"}}>
          <div style={{fontSize:11, fontWeight:600, marginBottom:6}}>我的订单</div>
          <div className="grid4">
            {["待付款","待发货","待收货","售后"].map(t=>(
              <div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",fontSize:9,gap:2}}>
                <div style={{width:22, height:22, border:"1.4px solid var(--ink)", borderRadius:6}}></div>
                {t}
              </div>
            ))}
          </div>
        </div>
        <HL />
        <div style={{padding:"4px 0"}}>
          {[
            ["📐","预约量尺"],["💰","推广分佣"],["📍","门店地址"],
            ["↗︎","分享小程序"],["🏪","商家入驻"],["⚙️","设置"]
          ].map(([ic,t])=>(
            <div key={t} className="row between" style={{padding:"8px 12px", borderBottom:"1px dashed var(--line-soft)", fontSize:11}}>
              <span>{ic} {t}</span><span style={{color:"var(--muted)"}}>›</span>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={["首页","分类","购物车","我的"]} active={3} />
    </React.Fragment>
  );
}

function UM_Orders() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="我的订单" />
      <div className="row" style={{padding:"6px 8px", gap:8, borderBottom:"1.2px dashed var(--line-soft)", fontSize:10}}>
        {["全部","待付款","待发货","待收货","售后"].map((t,i)=>(
          <span key={t} style={{fontWeight:i===2?700:400, color:i===2?"var(--accent)":"var(--ink)", borderBottom:i===2?"2px solid var(--accent)":"none", paddingBottom:2}}>{t}</span>
        ))}
      </div>
      <div className="pbody scroll">
        {[
          ["#1820291","待发货"],
          ["#1820288","待收货"],
          ["#1820286","已完成"],
        ].map(([no, st])=>(
          <div key={no} className="order-card">
            <div className="head"><span>{no}</span><span style={{color:"var(--accent)"}}>{st}</span></div>
            <div className="item">
              <div className="img x"></div>
              <div className="info"><div>实木餐桌 1.4m 橡木</div><div className="muted tiny">×1 · ¥1,288</div></div>
            </div>
            <HL dashed />
            <div className="ft">
              <Btn>查看详情</Btn>
              {st==="待发货" && <Btn>催发货</Btn>}
              {st==="待收货" && <Btn tone="primary">确认收货</Btn>}
              {st==="已完成" && <Btn>申请售后</Btn>}
            </div>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

function UM_Book() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="预约量尺" />
      <div className="pbody scroll">
        <div style={{fontSize:10, color:"var(--muted)"}}>填写预约信息，客服将与您联系确认</div>
        <Box><div className="label">联系人</div><div className="muted tiny">请输入姓名</div></Box>
        <Box><div className="label">手机号</div><div className="muted tiny">138****</div></Box>
        <Box><div className="label">预约地址</div><div className="muted tiny">点击选择 ›</div></Box>
        <Box><div className="label">预约时间</div><div className="muted tiny">📅 选择日期 / 时段</div></Box>
        <Box><div className="label">空间类型</div>
          <div className="row" style={{gap:4, flexWrap:"wrap", marginTop:3}}>
            {["客厅","餐厅","卧室","书房","儿童","其他"].map((s,i)=><Tag key={s} tone={i===0?"accent":""}>{s}</Tag>)}
          </div>
        </Box>
        <Box><div className="label">备注</div><div className="muted tiny" style={{minHeight:30}}>选填…</div></Box>
        <Btn block tone="primary" lg>提交预约</Btn>
      </div>
    </React.Fragment>
  );
}

function UM_Promote() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="推广分佣" right="?" />
      <div className="pbody scroll">
        <Box className="fill">
          <div style={{fontSize:10, color:"var(--muted)"}}>累计佣金 (¥)</div>
          <div style={{fontSize:22, fontWeight:700, color:"var(--accent)"}}>1,560.00</div>
          <div className="row between" style={{fontSize:10, marginTop:4}}>
            <span>本月 ¥320</span>
            <span>待结算 ¥45</span>
            <Btn>提现</Btn>
          </div>
        </Box>
        <div className="grid3" style={{gap:6}}>
          <Box style={{textAlign:"center"}}><div className="tiny muted">推广人数</div><b>23</b></Box>
          <Box style={{textAlign:"center"}}><div className="tiny muted">订单数</div><b>48</b></Box>
          <Box style={{textAlign:"center"}}><div className="tiny muted">转化率</div><b>12%</b></Box>
        </div>
        <Btn block tone="dark">生成专属推广海报</Btn>
        <div style={{fontSize:11, fontWeight:700}}>佣金明细</div>
        {[1,2,3].map(i=>(
          <div key={i} className="row between" style={{fontSize:10, padding:"6px 0", borderBottom:"1px dashed var(--line-soft)"}}>
            <div><div>订单 #18202{8+i}</div><div className="muted tiny">2025-05-0{i}</div></div>
            <span style={{color:"var(--accent)"}}>+¥{i*30}.00</span>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

function UM_Map() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="门店地址" right="🔍" />
      <div style={{position:"relative", flex:1, overflow:"hidden"}}>
        <div style={{position:"absolute", inset:0, background:
          "linear-gradient(90deg, transparent calc(20% - .5px), rgba(0,0,0,.08) 20%, transparent calc(20% + .5px))," +
          "linear-gradient(90deg, transparent calc(60% - .5px), rgba(0,0,0,.08) 60%, transparent calc(60% + .5px))," +
          "linear-gradient(0deg, transparent calc(30% - .5px), rgba(0,0,0,.08) 30%, transparent calc(30% + .5px))," +
          "linear-gradient(0deg, transparent calc(70% - .5px), rgba(0,0,0,.08) 70%, transparent calc(70% + .5px))," +
          "var(--paper-2)"
        }}></div>
        <div style={{position:"absolute", top:"35%", left:"45%", fontSize:22}}>📍</div>
        <div style={{position:"absolute", top:"50%", left:"30%", fontSize:18}}>📍</div>
        <div style={{position:"absolute", top:"60%", left:"60%", fontSize:18}}>📍</div>
      </div>
      <div style={{borderTop:"1.4px solid var(--ink)", padding:8, background:"var(--card)", flex:"0 0 auto"}}>
        <div style={{fontSize:11, fontWeight:700}}>经纬科技 · 望京店</div>
        <div style={{fontSize:10, color:"var(--muted)"}}>朝阳区望京xx路88号 · 距您 1.2km</div>
        <div className="row" style={{gap:6, marginTop:4}}>
          <Btn>📞 电话</Btn>
          <Btn tone="primary">导航前往</Btn>
        </div>
      </div>
    </React.Fragment>
  );
}

function UM_JoinApply() {
  return (
    <React.Fragment>
      <StatusBar />
      <NavBar left="‹" title="商家入驻" />
      <div className="pbody scroll">
        <div style={{textAlign:"center", padding:"6px 0"}}>
          <div style={{fontFamily:"ZCOOL KuaiLe, sans-serif", fontSize:18}}>欢迎加入经纬科技</div>
          <div className="muted tiny">填写资料 → 平台审核 → 开店成功</div>
        </div>
        <div className="grid2">
          <Box className="dashed" style={{textAlign:"center"}}>
            <div style={{fontSize:22}}>🏭</div>
            <div style={{fontSize:11, fontWeight:700}}>申请为厂家</div>
            <div className="tiny muted">可被门店申请代理</div>
            <Btn tone="primary">选择</Btn>
          </Box>
          <Box className="dashed" style={{textAlign:"center"}}>
            <div style={{fontSize:22}}>🏪</div>
            <div style={{fontSize:11, fontWeight:700}}>申请为门店</div>
            <div className="tiny muted">代理厂家商品销售</div>
            <Btn>选择</Btn>
          </Box>
        </div>
        <Box><div className="label">主体名称</div><div className="muted tiny">公司 / 个体名称</div></Box>
        <Box><div className="label">联系人 / 电话</div><div className="muted tiny">张先生 / 138****</div></Box>
        <Box><div className="label">营业执照</div>
          <div className="row" style={{gap:6, marginTop:4}}>
            <Img h={48} style={{width:48}} label="+"/>
            <Img h={48} style={{width:48}} label="+"/>
          </div>
        </Box>
        <Box><div className="label">经营品类</div><div className="muted tiny">多选 ›</div></Box>
        <Btn block tone="primary" lg>提交申请</Btn>
        <div className="tiny muted" style={{textAlign:"center"}}>预计 1-3 个工作日审核</div>
      </div>
    </React.Fragment>
  );
}

function UM_Login() {
  return (
    <React.Fragment>
      <StatusBar />
      <div style={{flex:1, position:"relative", display:"flex", flexDirection:"column"}}>
        <div style={{flex:1, background:"rgba(0,0,0,.55)"}}></div>
        <div style={{background:"var(--card)", borderTop:"1.4px solid var(--ink)", borderRadius:"16px 16px 0 0", padding:"16px 14px 12px"}}>
          <div style={{textAlign:"center", fontWeight:700, fontSize:14}}>登录后可查看零售价</div>
          <div className="muted tiny" style={{textAlign:"center", marginBottom:10}}>注册即同意《用户协议》</div>
          <Btn block tone="primary" lg>📱 微信一键登录</Btn>
          <div style={{height:8}}></div>
          <Btn block sq>手机号登录</Btn>
          <div style={{height:8}}></div>
          <div className="row between tiny muted"><span>○ 我已阅读并同意</span><span>取消</span></div>
        </div>
      </div>
    </React.Fragment>
  );
}

function UMScreens() {
  return (
    <Role id="user-mini" num="01" title="用户端 · 微信小程序" en="Customer / Mini-Program" desc="面向普通客户：浏览商品、申请查看价格、下单、预约、推广分佣，并可申请成为门店或厂家。">
      <Sub title="主流程 · 浏览→下单→支付" hint="Home → Detail → Cart → Pay">
        <div className="phone-row">
          <Phone idx="01" title="首页 · 瀑布流"><UM_Home /></Phone>
          <Phone idx="02" title="商品详情"><UM_Detail /></Phone>
          <Phone idx="03" title="购物车"><UM_Cart /></Phone>
          <Phone idx="04" title="确认订单"><UM_Confirm /></Phone>
          <Phone idx="05" title="支付"><UM_Pay /></Phone>
        </div>
      </Sub>
      <Sub title="发现 · 分类 / 登录拦截">
        <div className="phone-row">
          <Phone idx="06" title="分类页"><UM_Cat /></Phone>
          <Phone idx="07" title="未登录登录弹窗"><UM_Login /></Phone>
        </div>
      </Sub>
      <Sub title="我的 · 个人中心">
        <div className="phone-row">
          <Phone idx="08" title="我的 · 未登录"><UM_Me_Logout /></Phone>
          <Phone idx="09" title="我的订单"><UM_Orders /></Phone>
          <Phone idx="10" title="预约量尺"><UM_Book /></Phone>
          <Phone idx="11" title="推广分佣"><UM_Promote /></Phone>
          <Phone idx="12" title="门店地址(地图)"><UM_Map /></Phone>
          <Phone idx="13" title="商家入驻申请"><UM_JoinApply /></Phone>
        </div>
      </Sub>
    </Role>
  );
}

window.UMScreens = UMScreens;
