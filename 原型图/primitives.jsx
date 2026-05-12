// Shared atomic primitives for the wireframe doc.
// Loaded as Babel JSX; exports go onto window so other scripts can use them.

const { useState } = React;

// === Phone frame ===
function Phone({ idx, title, children, style }) {
  return (
    <div className="phone" style={style}>
      <div className="frame">
        <div className="screen">{children}</div>
      </div>
      <div className="caption">
        <span className="idx">{idx}</span>{title}
      </div>
    </div>
  );
}

function StatusBar({ light }) {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="right">
        <span className="dot"></span><span className="dot"></span><span className="dot"></span>
        <span style={{marginLeft:4}}>📶</span>
        <span className="bar"></span>
      </span>
    </div>
  );
}

function NavBar({ title, left, right, sub }) {
  return (
    <div style={{
      borderBottom: "1.4px solid var(--ink)",
      padding: "6px 10px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--card)",
      fontSize: 13,
      gap: 8,
      flex: "0 0 auto"
    }}>
      <span style={{minWidth:18, fontSize: 14}}>{left ?? ""}</span>
      <span style={{flex:1, textAlign:"center", fontWeight: 600}}>{title}{sub && <div style={{fontSize:9, color:"var(--muted)", fontWeight:400}}>{sub}</div>}</span>
      <span style={{minWidth:18, fontSize: 14, textAlign:"right"}}>{right ?? ""}</span>
    </div>
  );
}

function TabBar({ items, active }) {
  return (
    <div className={"tabbar" + (items.length === 5 ? " col5" : "")}>
      {items.map((it, i) => (
        <div key={i} className={"tab" + (i === active ? " on" : "")}>
          <span className="ic"></span>
          <span>{it}</span>
        </div>
      ))}
    </div>
  );
}

// === PC frame ===
function PCWindow({ idx, title, url, side, active, children, sub }) {
  return (
    <div className="pc">
      <div className="chrome">
        <span className="dots"><span style={{background:"#ff6058"}}></span><span style={{background:"#ffbd2e"}}></span><span style={{background:"#28c93f"}}></span></span>
        <span className="url">{url}</span>
      </div>
      <div className="pc-body">
        <aside className="pc-side">
          <div className="brand"><span className="logo"></span>{side?.brand || "管理后台"}</div>
          {(side?.menu || []).map((m, i) => (
            <div key={i} className={"menu" + (i === active ? " on" : "") + (m.sub ? " sub" : "")}>
              {!m.sub && <span className="mi"></span>}
              <span>{m.label}</span>
            </div>
          ))}
        </aside>
        <main className="pc-main">{children}</main>
      </div>
      <div className="pc-caption"><span className="idx">{idx}</span>{title}{sub && <span style={{marginLeft:10, color:"var(--muted)"}}>· {sub}</span>}</div>
    </div>
  );
}

function PCTopbar({ title, crumbs, actions }) {
  return (
    <div className="pc-topbar">
      <div>
        <div className="crumbs">{crumbs}</div>
        <div className="title">{title}</div>
      </div>
      <div className="actions">{actions}</div>
    </div>
  );
}

// Section / sub
function Role({ id, num, title, en, desc, children }) {
  return (
    <section id={id} className="role-section">
      <div className="role-head">
        <div className="role-num">{num}</div>
        <div className="role-title">
          <h2>{title}</h2>
          <div className="en">{en}</div>
        </div>
      </div>
      {desc && <p className="role-desc">{desc}</p>}
      {children}
    </section>
  );
}
function Sub({ title, hint, children }) {
  return (
    <div>
      <div className="sub-section"><h3>{title}</h3>{hint && <span className="hint">— {hint}</span>}</div>
      {children}
    </div>
  );
}

// generic
function Box({ children, className="", style }) {
  return <div className={"box " + className} style={style}>{children}</div>;
}
function Tag({ children, tone }) {
  return <span className={"tag" + (tone ? " " + tone : "")}>{children}</span>;
}
function Btn({ children, tone, block, lg, sq }) {
  return <span className={"btn" + (tone?" "+tone:"") + (block?" block":"") + (lg?" lg":"") + (sq?" sq":"")}>{children}</span>;
}
function Input({ placeholder, sq, lg, icon }) {
  return <div className={"input" + (sq?" sq":"") + (lg?" lg":"")}>{icon}<span className="placeholder">{placeholder}</span></div>;
}
function Img({ h, label, x, solid, style }) {
  return <div className={"img" + (x?" x":"") + (solid?" solid":"")} style={{height: h, ...style}}>{label}</div>;
}
function HL({ dashed, soft }) { return <div className={"h-line" + (dashed?" dashed":"") + (soft?" soft":"")}></div>; }

Object.assign(window, {
  Phone, StatusBar, NavBar, TabBar,
  PCWindow, PCTopbar,
  Role, Sub,
  Box, Tag, Btn, Input, Img, HL,
});
