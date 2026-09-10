import React from 'react';
import { CaretRight, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import './title-screen.css';

export function TitleScreen({ loaded, start, openPanel, muted, sound }) {
  const navigate = (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement);
    buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  };
  return (
    <section className="title-screen" aria-label="게임 타이틀 화면">
      <div className="title-location" aria-hidden="true">SEOUL <span>BLACK RAIN DISTRICT</span></div>
      <button className="title-sound" onClick={sound} aria-label={muted ? '음향 켜기' : '음향 끄기'}>
        {muted ? <SpeakerSlash size={20}/> : <SpeakerHigh size={20}/>}
        <span>사운드 {muted ? 'OFF' : 'ON'}</span>
      </button>

      <div className="title-core">
        <div className="title-logo">
          <p className="title-prologue">네온 아래, 마지막 자유.</p>
          <h1><span className="title-neon">NEON</span><span className="title-requiem">REQUIEM</span></h1>
          <p className="title-korean">네 온 레 퀴 엠</p>
        </div>
        <nav className="title-menu" aria-label="게임 메뉴" onKeyDown={navigate}>
          <button className="title-start" disabled={!loaded} onClick={start}>
            <CaretRight weight="fill"/><span>{loaded ? '게임 시작' : '전장 불러오는 중'}</span><small>NEW RUN</small>
          </button>
          <button onClick={() => openPanel('armoury')}><CaretRight weight="fill"/><span>무기 도감</span><small>ARSENAL</small></button>
          <button onClick={() => openPanel('archives')}><CaretRight weight="fill"/><span>작전 기록</span><small>RECORDS</small></button>
        </nav>
        <p className="title-run-rule">무작위 무기 하나. 끝없이 달라지는 전투.</p>
      </div>

      <footer className="title-footer">
        <span className="title-input-hint"><kbd>↑ ↓</kbd> 메뉴 이동 <kbd>ENTER</kbd> 선택</span>
        <span className="title-touch-hint">메뉴를 터치하여 시작</span>
        <span className="title-version">SINGLE PLAYER <i/> NR—01</span>
      </footer>
    </section>
  );
}
