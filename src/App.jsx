import React, { useEffect, useRef, useState } from "react";
import { createCombatAudio } from './audio.js';
import { TitleScreen } from './TitleScreen.jsx';
import { WEAPONS, grantStarterWeapon, weaponSummary } from './weapons.js';
import {
  Crosshair,
  Lightning,
  CaretDoubleRight,
  Pause,
  SpeakerHigh,
  SpeakerSlash,
  Play,
  ArrowUpRight,
  X,
  Drone,
  ArrowCounterClockwise,
  Sword,
  Waves,
  Spiral,
  Planet,
} from "@phosphor-icons/react";
import {
  createState,
  step,
  render,
  dash,
  overclock,
  chooseUpgrade,
  nextSector,
  UPGRADES,
} from "./game";
const ICONS = {
  crosshair: Crosshair,
  lightning: Lightning,
  drone: Drone,
  dash: CaretDoubleRight,
  sword: Sword,
  waves: Waves,
  spiral: Spiral,
  planet: Planet,
};
const time = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
export function App({ initialState = createState } = {}) {
  const engine = useRef(null);
  if (!engine.current) engine.current = initialState();
  const
    canvas = useRef(null),
    audio = useRef(null),
    [s, setS] = useState({ ...engine.current }),
    [muted, setMuted] = useState(true),
    [panel, setPanel] = useState(null),
    [best, setBest] = useState(() => {
      try {
        return (
          JSON.parse(localStorage.getItem("neon-best")) || { kills: 0, time: 0 }
        );
      } catch {
        return { kills: 0, time: 0 };
      }
    }),
    [loaded, setLoaded] = useState(false);
  const refresh = () => setS({ ...engine.current });
  useEffect(() => {
    if (loaded && s.mode === "menu") document.querySelector(".title-start")?.focus({ preventScroll: true });
  }, [loaded, s.mode]);
  useEffect(() => {
    let stopped = false,
      frame,
      prev = 0,
      lastUI = 0;
    const imgs = {
      bg: new Image(),
      player: new Image(),
      enemy: new Image(),
      terminal: new Image(),
      arcology: new Image(),
      atlas: new Image(),
    };
    imgs.bg.src = "/assets/battlefield.png";
    imgs.terminal.src = "/assets/terminal.png";
    imgs.arcology.src = "/assets/arcology.png";
    imgs.player.src = "/assets/runner.png";
    imgs.atlas.src = "/assets/walk-atlas.png";
    imgs.enemy.src = "/assets/enemy.png";
    Promise.all(Object.values(imgs).map((im) => im.decode()))
      .then(() => {
        // Generated atlas has a light checker matte. Flood only connected background,
        // preserving enclosed metallic highlights and the actual limb silhouettes.
        const sheet = document.createElement("canvas");
        sheet.width = imgs.atlas.naturalWidth; sheet.height = imgs.atlas.naturalHeight;
        const context = sheet.getContext("2d", { willReadFrequently: true });
        context.drawImage(imgs.atlas, 0, 0);
        const pixels = context.getImageData(0, 0, sheet.width, sheet.height);
        const { data } = pixels, count = sheet.width * sheet.height;
        const visited = new Uint8Array(count), queue = new Int32Array(count);
        let head = 0, tail = 0;
        const add = (i) => {
          if (i < 0 || i >= count || visited[i]) return;
          visited[i] = 1;
          const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
          if (Math.min(r,g,b) > 155 && Math.max(r,g,b) - Math.min(r,g,b) < 25) queue[tail++] = i;
        };
        for (let x = 0; x < sheet.width; x++) { add(x); add(count-sheet.width+x); }
        for (let y = 0; y < sheet.height; y++) { add(y*sheet.width); add((y+1)*sheet.width-1); }
        while (head < tail) {
          const i = queue[head++]; data[i*4+3] = 0;
          if (i % sheet.width) add(i-1);
          if (i % sheet.width < sheet.width-1) add(i+1);
          add(i-sheet.width); add(i+sheet.width);
        }
        context.putImageData(pixels, 0, 0);
        imgs.walkAtlas = sheet;
        if (!stopped) setLoaded(true);
      })
      .catch(() => !stopped && setPanel("asset-error"));
    const tick = (now) => {
      if (stopped) return;
      const dt = Math.min((now - prev) / 1000 || 0, 0.04);
      prev = now;
      const st = engine.current,
        before = st.mode;
      step(st, dt);
      const events = st.sounds.splice(0);
      if (events.length) audio.current?.play(events);
      const c = canvas.current;
      if (c) {
        const dpr = Math.min(devicePixelRatio, 2),
          w = c.clientWidth,
          h = c.clientHeight;
        if (c.width !== w * dpr || c.height !== h * dpr) {
          c.width = w * dpr;
          c.height = h * dpr;
        }
        const ctx = c.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        render(ctx, st, imgs, w, h, now / 1000);
      }
      if (now - lastUI > 80 || before !== st.mode) {
        setS({ ...st });
        lastUI = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const down = (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      const st = engine.current;
      if (e.key === "Escape" && !e.repeat) {
        if (st.mode === "playing") {
          st.mode = "paused";
          st.keys.clear();
        } else if (st.mode === "paused") st.mode = "playing";
        return;
      }
      st.keys.add(e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : e.key.toLowerCase());
      if (e.key === "Shift") dash(st);
      if (e.code === "Space") overclock(st);
    };
    const up = (e) => engine.current.keys.delete(e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : e.key.toLowerCase());
    const blur = () => {
      engine.current.keys.clear();
      engine.current.stick = { x: 0, y: 0 };
      if (engine.current.mode === "playing") engine.current.mode = "paused";
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  useEffect(() => {
    if (s.mode === "dead" || s.mode === "won") {
      const b = {
        kills: Math.max(best.kills, s.kills),
        time: Math.max(best.time, s.time),
      };
      setBest(b);
      try {
        localStorage.setItem("neon-best", JSON.stringify(b));
      } catch {}
    }
  }, [s.mode]);
  useEffect(() => {
    const dialog = document.querySelector(".overlay");
    if (!dialog) return;
    const previous = document.activeElement;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute(
      "aria-label",
      dialog.querySelector("h2")?.textContent || "게임 메뉴",
    );
    dialog.querySelector("button")?.focus();
    const trap = (e) => {
      if (e.key === "Escape" && panel) {
        e.stopImmediatePropagation();
        setPanel(null);
      }
      if (e.key !== "Tab") return;
      const buttons = [...dialog.querySelectorAll("button:not(:disabled)")];
      const index = buttons.indexOf(document.activeElement);
      e.preventDefault();
      buttons[
        (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus();
    };
    window.addEventListener("keydown", trap, true);
    return () => {
      window.removeEventListener("keydown", trap, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [s.mode, panel]);
  useEffect(
    () => () => {
      audio.current?.dispose().catch(() => {});
      audio.current = null;
    },
    [],
  );
  const sound = async () => {
    try {
      if (!audio.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio.current = createCombatAudio(new AC());
      }
      const enabled = await audio.current.setMuted(!muted);
      setMuted(!enabled);
      if (enabled) audio.current.play(['upgrade']);
    } catch {
      setMuted(true);
    }
  };
  const start = () => {
    audio.current?.play(['ui']);
    engine.current = createState();
    grantStarterWeapon(engine.current);
    engine.current.mode = "playing";
    setPanel(null);
    refresh();
  };
  const setMode = (mode) => {
    if (mode === 'menu') engine.current = createState();
    engine.current.mode = mode;
    engine.current.keys.clear();
    engine.current.stick = { x: 0, y: 0 };
    refresh();
  };
  const action = (fn) => {
    fn(engine.current);
    refresh();
  };
  const joystick = (e) => {
    const r = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - r.left - r.width / 2) / 35,
      y = (e.clientY - r.top - r.height / 2) / 35,
      d = Math.max(1, Math.hypot(x, y));
    engine.current.stick = { x: x / d, y: y / d };
  };
  const boss = s.enemies.find(e => e.type === 'boss' && e.hp > 0);
  return (
    <main className={`game-shell ${s.mode === "menu" ? "in-menu" : ""}`}>
      <canvas
        ref={canvas}
        aria-label="네온 레퀴엠 전장. WASD 또는 조이스틱 이동, Shift 회피, Space 오버클럭."

      />
      {s.mode === "menu" ? (
        <TitleScreen loaded={loaded} start={start} openPanel={name => { audio.current?.play(['ui']); setPanel(name); }} muted={muted} sound={sound} />
      ) : (
        <>
          <header className="simple-hud">
            <div className="status-bars">
              <div className="status-bar health" role="progressbar" aria-label="체력" aria-valuenow={Math.ceil(s.hp)} aria-valuemin={0} aria-valuemax={s.maxHp}>
                <i style={{ width: `${s.hp / s.maxHp * 100}%` }} />
                <span>체력</span><strong>{Math.ceil(s.hp)} / {s.maxHp}</strong>
              </div>
              <div className="status-bar experience" role="progressbar" aria-label="경험치" aria-valuenow={s.xp} aria-valuemin={0} aria-valuemax={s.nextXp}>
                <i style={{ width: `${s.xp / s.nextXp * 100}%` }} />
                <span>경험치 · LV.{s.level}</span><strong>{s.xp} / {s.nextXp}</strong>
              </div>
            </div>
            <div className="operation-strip">
              <span>구역 0{s.sector + 1} <b>{time(s.time)}</b></span>
              <span>처치 {s.kills} · {boss ? '집행관 처치' : `중계기 ${s.nodes.filter(n => n.p >= 1).length}/3`}</span>
              <button className="icon-button" onClick={sound} aria-label={muted ? "음향 켜기" : "음향 끄기"}>{muted ? <SpeakerSlash /> : <SpeakerHigh />}</button>
              <button className="icon-button" onClick={() => setMode("paused")} aria-label="일시정지"><Pause /></button>
            </div>
            {boss && (
              <div className="boss-strip">
                <span>NULL WARDEN <b>{boss.enraged ? '과부하' : '집행관'}</b></span>
                <div role="progressbar" aria-label="집행관 체력" aria-valuenow={Math.max(0, Math.ceil(boss.hp))} aria-valuemin={0} aria-valuemax={boss.maxHp}>
                  <i style={{ width: `${Math.max(0, boss.hp / boss.maxHp * 100)}%` }} />
                </div>
                <strong>{Math.max(0, Math.ceil(boss.hp / boss.maxHp * 100))}%</strong>
              </div>
            )}
          </header>
          {s.noticeTime > 0 && s.mode === "playing" && (
            <div className={`transmission ${boss ? 'with-boss' : ''}`}>
              
              {s.notice}
            </div>
          )}
          <div className="bottom-hud">
            <div className="abilities">
              <button disabled={s.dash > 0} onClick={() => action(dash)}>
                <CaretDoubleRight size={36} weight="bold" />
                <strong>{s.dash > 0 ? `${s.dash.toFixed(1)}s` : "DASH"}</strong>
                <kbd>SHIFT</kbd>
              </button>
              <button
                className={s.heat >= 100 ? "ready" : ""}
                disabled={s.heat < 100}
                onClick={() => action(overclock)}
              >
                <Lightning size={36} weight="fill" />
                <strong>
                  {s.heat >= 100 ? "OVERCLOCK" : `${Math.floor(s.heat)}%`}
                </strong>
                <kbd>SPACE</kbd>
                <i style={{ width: `${s.heat}%` }} />
              </button>
            </div>
          </div>
          <div
            className="joystick"
            role="application"
            aria-label="터치 이동 조이스틱"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              joystick(e);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) joystick(e);
            }}
            onPointerUp={() => (engine.current.stick = { x: 0, y: 0 })}
            onPointerCancel={() => (engine.current.stick = { x: 0, y: 0 })}
            onLostPointerCapture={() => (engine.current.stick = { x: 0, y: 0 })}
          >
            <Crosshair size={32} style={{ transform: `translate(${s.stick.x * 26}px, ${s.stick.y * 26}px)` }} />
          </div>
        </>
      )}
      {panel && (
        <div className="overlay">
          <section className="modal">
            <button
              className="close icon-button"
              onClick={() => setPanel(null)}
              aria-label="닫기"
            >
              <X />
            </button>
            <div className="eyebrow">ENCRYPTED NETWORK / LOCAL ACCESS</div>
            <h2>
              {panel === "armoury"
                ? "무기 도감"
                : panel === "asset-error"
                  ? "전장 연결 실패"
                  : "작전 기록"}
            </h2>
            {panel === "armoury" ? (
              <>
                <p>
                  무작위 무기 하나로 시작합니다. 레벨업마다 3개 선택지에서 새 무기를 장착하거나 보유 무기를 강화하세요. 장착한 무기는 모두 동시에 자동 공격합니다.
                </p>
                <div className="catalog">
                  {UPGRADES.map((u) => {
                    const I = ICONS[u.icon];
                    return (
                      <article key={u.id}>
                        <I size={27} />
                        <div>
                          <h3>{u.name}</h3>
                          <small>{u.en}</small>
                          <p>{u.desc}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : panel === "asset-error" ? (
              <p>
                이미지를 불러오지 못했습니다. 페이지를 새로고침해 다시 연결해
                주세요.
              </p>
            ) : (
              <>
                <p>
                  탈주 용병의 마지막 신호. 중계기 세 개를 연결하고 기업의
                  격리망을 돌파하세요.
                </p>
                <div className="stats">
                  <div>
                    <strong>{best.kills}</strong>
                    <span>최고 처치 기록</span>
                  </div>
                  <div>
                    <strong>{time(best.time)}</strong>
                    <span>최장 생존 시간</span>
                  </div>
                </div>
                <p>기록은 이 브라우저에 저장됩니다.</p>
              </>
            )}
          </section>
        </div>
      )}
      {["paused", "upgrade", "sector", "won", "dead"].includes(s.mode) && (
        <div className="overlay">
          <section className={`modal ${s.mode === "upgrade" ? "wide" : ""}`}>
            <div className="eyebrow">
              NEURAL LINK /{" "}
              {s.mode === "upgrade"
                ? "UPGRADE AVAILABLE"
                : s.mode === "paused"
                  ? "CONNECTION SUSPENDED"
                  : "MISSION REPORT"}
            </div>
            <h2>
              {
                {
                  paused: "신호 일시정지",
                  upgrade: "한계를 다시 쓴다.",
                  sector: "구역 연결 완료",
                  won: "도시는 당신을 기억한다.",
                  dead: "신호가 끊겼습니다.",
                }[s.mode]
              }
            </h2>
            {s.mode === "upgrade" ? (
              <>
                <p>
                  LEVEL {s.level} · 새 무기 장착 또는 보유 무기 강화. 전투는 잠시 멈춰 있습니다.
                </p>
                <div className="upgrade-grid">
                  {s.choices.map((u) => {
                    const I = ICONS[u.icon];
                    const rank = s.weapons[u.id] || 0;
                    return (
                      <button
                        key={u.id}
                        className={rank ? 'weapon-upgrade' : 'weapon-new'}
                        onClick={() => action((st) => chooseUpgrade(st, u.id))}
                      >
                        <I size={38} />
                        <div className="choice-kind">{rank ? '보유 무기 강화' : '새 무기 장착'}<b>{rank ? `LV.${rank} → ${rank + 1}` : 'NEW'}</b></div>
                        <small>{u.en}</small>
                        <h3>{u.name}</h3>
                        <p>{u.desc}</p>
                        <div className="weapon-comparison">
                          {rank > 0 && <del>{weaponSummary(s,u.id,rank)}</del>}
                          <strong>{weaponSummary(s,u.id,rank+1)}</strong>
                        </div>
                        <span>
                          {rank ? '강화한다' : '장착한다'} <ArrowUpRight />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : s.mode === "paused" ? (
              <>
                <p>숨을 고르세요. 도시는 기다립니다.</p>
                <div className="modal-actions">
                  <button
                    className="primary"
                    onClick={() => setMode("playing")}
                  >
                    <Play /> 전투 재개
                  </button>
                  <button onClick={() => setMode("menu")}>메인 메뉴</button>
                </div>
                <div className="owned-weapons" aria-label="보유 무기">
                  <h3>보유 무기 · 동시 자동 공격</h3>
                  {WEAPONS.filter(w=>s.weapons[w.id]).map(w=>{
                    const I=ICONS[w.icon];
                    return <div key={w.id}><I size={22}/><section><b>{w.name} <em>LV.{s.weapons[w.id]}</em></b><small>{weaponSummary(s,w.id)}</small></section></div>;
                  })}
                </div>
                <p className="help">
                  WASD / 조이스틱 이동 · Shift 회피 · Space 오버클럭
                  <br />
                  중계기 타원 안에서 누적 8초 유지하면 해킹이 완료됩니다.
                  <br />
                  돌진 경로·사격선·폭발 범위를 피하세요. 최종 구역은 집행관 처치로 완료됩니다.
                </p>
              </>
            ) : (
              <>
                <p>
                  {s.mode === "sector"
                    ? "다음 격리망이 열렸습니다. 무장과 강화는 유지됩니다."
                    : s.mode === "won"
                      ? "기업의 격리망을 돌파했습니다. 오늘 밤, 자유는 당신의 것입니다."
                      : "다시 접속하세요. 이번에는 다른 조합으로."}
                </p>
                <div className="stats">
                  <div>
                    <strong>{time(s.time)}</strong>
                    <span>생존 시간</span>
                  </div>
                  <div>
                    <strong>{s.kills}</strong>
                    <span>적 처치</span>
                  </div>
                  <div>
                    <strong>{s.level}</strong>
                    <span>레벨</span>
                  </div>
                </div>
                <div className="modal-actions">
                  {s.mode === "sector" ? (
                    <button
                      className="primary"
                      onClick={() => action(nextSector)}
                    >
                      다음 구역 진입 <ArrowUpRight />
                    </button>
                  ) : (
                    <button className="primary" onClick={start}>
                      <ArrowCounterClockwise /> 다시 접속
                    </button>
                  )}
                  <button onClick={() => setMode("menu")}>메인 메뉴</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
