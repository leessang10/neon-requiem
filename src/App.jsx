import React, { useEffect, useRef, useState } from "react";
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
  ShieldCheck,
  ArrowCounterClockwise,
  Heart,
} from "@phosphor-icons/react";
import {
  createState,
  step,
  render,
  dash,
  overclock,
  chooseUpgrade,
  nextSector,
  SECTORS,
  UPGRADES,
} from "./game";
const ICONS = {
  crosshair: Crosshair,
  lightning: Lightning,
  drone: Drone,
  heart: Heart,
  dash: CaretDoubleRight,
};
const time = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
export function App() {
  const engine = useRef(createState()),
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
    };
    imgs.bg.src = "/assets/battlefield.png";
    imgs.terminal.src = "/assets/terminal.png";
    imgs.arcology.src = "/assets/arcology.png";
    imgs.player.src = "/assets/runner.png";
    imgs.enemy.src = "/assets/enemy.png";
    Promise.all(Object.values(imgs).map((im) => im.decode()))
      .then(() => !stopped && setLoaded(true))
      .catch(() => !stopped && setPanel("asset-error"));
    const tick = (now) => {
      if (stopped) return;
      const dt = Math.min((now - prev) / 1000 || 0, 0.04);
      prev = now;
      const st = engine.current,
        before = st.mode;
      step(st, dt);
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
        render(ctx, st, imgs, w, h);
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
      st.keys.add(e.key.toLowerCase());
      if (e.key === "Shift") dash(st);
      if (e.code === "Space") overclock(st);
    };
    const up = (e) => engine.current.keys.delete(e.key.toLowerCase());
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
      audio.current?.close();
    },
    [],
  );
  const sound = () => {
    const next = !muted;
    setMuted(next);
    if (!audio.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = new AC();
      audio.current = ac;
      const gain = ac.createGain();
      gain.gain.value = 0.025;
      gain.connect(ac.destination);
      [55, 82.41, 110].forEach((hz, i) => {
        const o = ac.createOscillator();
        o.type = i ? "sine" : "triangle";
        o.frequency.value = hz;
        o.connect(gain);
        o.start();
      });
    }
    if (next) audio.current.suspend();
    else audio.current.resume();
  };
  const start = () => {
    engine.current = createState();
    engine.current.mode = "playing";
    setPanel(null);
    refresh();
  };
  const setMode = (mode) => {
    if (mode === 'menu') engine.current = createState();
    engine.current.mode = mode;
    engine.current.keys.clear();
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
  return (
    <main className={`game-shell ${s.mode === "menu" ? "in-menu" : ""}`}>
      <canvas
        ref={canvas}
        aria-label="네온 레퀴엠 전장. WASD 또는 방향키 이동, Shift 회피, Space 오버클럭."
        onPointerDown={(e) => {
          const st = engine.current;
          if (st.mode !== "playing") return;
          const r = e.currentTarget.getBoundingClientRect(),
            scale = Math.max(r.width / 1440, r.height / 1024),
            vw = r.width / scale,
            vh = r.height / scale,
            cx = Math.max(0, Math.min(1440 - vw, st.x - vw / 2)),
            cy = Math.max(0, Math.min(1024 - vh, st.y - vh / 2));
          st.target = {
            x: (e.clientX - r.left) / scale + cx,
            y: (e.clientY - r.top) / scale + cy,
          };
        }}
      />
      {s.mode === "menu" ? (
        <>
          <header className="menu-header">
            <a className="wordmark" href="#">
              <Crosshair size={24} /> NEON REQUIEM<span>NR—01</span>
            </a>
            <nav>
              <button
                className={!panel ? "active" : ""}
                onClick={() => setPanel(null)}
              >
                작전<small>CAMPAIGN</small>
              </button>
              <button onClick={() => setPanel("armoury")}>
                암시장<small>BLACK MARKET</small>
              </button>
              <button onClick={() => setPanel("archives")}>
                기록<small>ARCHIVES</small>
              </button>
            </nav>
            <button
              className="icon-button"
              onClick={sound}
              aria-label={muted ? "음향 켜기" : "음향 끄기"}
            >
              {muted ? <SpeakerSlash /> : <SpeakerHigh />}
            </button>
          </header>
          <section className="hero">
            <div className="eyebrow">CONNECTION ESTABLISHED / SEOUL SECTOR</div>
            <h1>
              NEON
              <br />
              <span>REQUIEM</span>
              <sup>01</sup>
            </h1>
            <p className="kicker">네온 아래, 마지막 자유.</p>
            <p className="hero-copy">
              도시는 당신을 지웠다.
              <br />
              이제 당신이 도시의 규칙을 지울 차례다.
            </p>
            <button className="start-button" disabled={!loaded} onClick={start}>
              <Crosshair size={26} />
              <span>
                {loaded ? "도시에 접속한다" : "전장 불러오는 중"}
                <small>JACK INTO THE CITY</small>
              </span>
              <ArrowUpRight size={25} />
            </button>
            <div className="controls">
              <kbd>W A S D</kbd> 이동 <kbd>SHIFT</kbd> 회피 <kbd>SPACE</kbd>{" "}
              오버클럭
            </div>
          </section>
          <aside className="brief-card">
            <div className="eyebrow">
              ACTIVE CONTRACT <span>001 / 003</span>
            </div>
            <div className="contract-rule" />
            <small>첫 번째 작전 지역</small>
            <h2>
              BLACK RAIN
              <br />
              DISTRICT
            </h2>
            <p>서울 하층 구역 · 블랙 레인</p>
            <dl>
              <div>
                <dt>목표</dt>
                <dd>중계기 3개 해킹</dd>
              </div>
              <div>
                <dt>적성 세력</dt>
                <dd className="red">기업 보안 병력</dd>
              </div>
              <div>
                <dt>작전 방식</dt>
                <dd>생존 · 자동 사격</dd>
              </div>
            </dl>
            <div className="encrypted">
              <ShieldCheck size={20} />
              <span>
                신원 삭제 완료.
                <br />
                당신의 다음 선택은 기록되지 않는다.
              </span>
            </div>
          </aside>
          <footer className="menu-footer">
            <span>
              <b>01</b> BLACK RAIN DISTRICT
            </span>
            <span>02 GHOSTLINE TERMINAL</span>
            <span>03 KINTSUGI ARCOLOGY</span>
            <small>SOLO SURVIVAL / 한국어</small>
          </footer>
        </>
      ) : (
        <>
          <header className="hud-top">
            <div className="vitals">
              <img src="/assets/runner.png" alt="사이버 용병" />
              <div>
                <div className="hud-brand">NEON REQUIEM</div>
                <div className="hp-label">
                  HP{" "}
                  <strong>
                    {Math.ceil(s.hp)} / {s.maxHp}
                  </strong>
                  <small>LV. {s.level}</small>
                </div>
                <div className="meter health">
                  <i style={{ width: `${(s.hp / s.maxHp) * 100}%` }} />
                </div>
                <div className="sync-label">
                  SYNC {Math.floor((s.xp / s.nextXp) * 100)}%{" "}
                  <span>
                    {s.xp} / {s.nextXp}
                  </span>
                </div>
                <div className="meter xp">
                  <i style={{ width: `${(s.xp / s.nextXp) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="timer">
              <div>SECTOR 0{s.sector + 1}</div>
              <p>{SECTORS[s.sector]}</p>
              <strong>{time(s.time)}</strong>
              <small>
                ELIMINATED <b>{s.kills}</b>
              </small>
            </div>
            <div className="mission">
              <div className="mission-title">
                <Crosshair size={23} /> 중계기 해킹{" "}
                <b>{s.nodes.filter((n) => n.p >= 1).length}/3</b>
              </div>
              <div className="mission-nodes">
                {s.nodes.map((n, i) => (
                  <span className={n.p >= 1 ? "linked" : ""} key={i}>
                    {String(i + 1).padStart(2, "0")}
                    <i style={{ width: `${n.p * 100}%` }} />
                  </span>
                ))}
              </div>
              <small>중계기 반경에서 8초간 연결 유지</small>
              <div className="top-actions">
                <button
                  className="icon-button"
                  onClick={sound}
                  aria-label={muted ? "음향 켜기" : "음향 끄기"}
                >
                  {muted ? <SpeakerSlash /> : <SpeakerHigh />}
                </button>
                <button
                  className="icon-button"
                  onClick={() => setMode("paused")}
                  aria-label="일시정지"
                >
                  <Pause />
                </button>
              </div>
            </div>
          </header>
          {s.noticeTime > 0 && s.mode === "playing" && (
            <div className="transmission">
              <span>INCOMING TRANSMISSION</span>
              {s.notice}
            </div>
          )}
          <div className="bottom-hud">
            <div className="weapon-rack">
              <div className="weapon selected">
                <img
                  className="rifle-icon"
                  src="/assets/rifle.png"
                  alt="스마트 라이플"
                />
                <span>
                  SMART RIFLE · {Math.floor(s.damage / 18)}
                  <small>AUTO / {Math.round(s.damage)} DMG</small>
                </span>
                <b>01</b>
              </div>
              <div className={`weapon compact ${s.drones ? "equipped" : ""}`}>
                <Drone size={26} />
                <small>{s.drones ? `DRONE ×${s.drones}` : "OFFLINE"}</small>
              </div>
              <div className={`weapon compact ${s.arc ? "equipped" : ""}`}>
                <Lightning size={26} />
                <small>{s.arc ? `ARC ${s.arc}` : "OFFLINE"}</small>
              </div>
            </div>
            <div className="battle-controls">
              <kbd>WASD</kbd> 이동 <kbd>SHIFT</kbd> 회피 <kbd>ESC</kbd> 일시정지
            </div>
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
          >
            <Crosshair size={32} />
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
                ? "블랙 마켓"
                : panel === "asset-error"
                  ? "전장 연결 실패"
                  : "데이터 보관소"}
            </h2>
            {panel === "armoury" ? (
              <>
                <p>
                  전투 중 데이터를 회수하면 아래 사이버웨어를 선택할 수
                  있습니다.
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
                  LEVEL {s.level} · 사이버웨어를 하나 선택하세요. 전투는 잠시
                  멈춰 있습니다.
                </p>
                <div className="upgrade-grid">
                  {s.choices.map((u) => {
                    const I = ICONS[u.icon];
                    return (
                      <button
                        key={u.id}
                        onClick={() => action((st) => chooseUpgrade(st, u.id))}
                      >
                        <I size={38} />
                        <small>{u.en}</small>
                        <h3>{u.name}</h3>
                        <p>{u.desc}</p>
                        <span>
                          INSTALL <ArrowUpRight />
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
                <p className="help">
                  WASD / 방향키 이동 · Shift 회피 · Space 오버클럭
                  <br />
                  중계기 원 안에서 8초 유지하면 해킹이 완료됩니다.
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
