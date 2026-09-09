'use client';

/* 외솔길 탐험 — 울산 지도에서 외솔의 자리 셋을 차례로 찾는다 (기획서 §8-7)
   지도 API 가 필요한 유일한 게임이다. 카카오맵 JavaScript SDK 를 쓴다.

   장소 좌표는 데이터에 적어 두지 않고 카카오 주소·장소 찾기로 그때그때 푼다.
   좌표를 손으로 적으면 틀린 자리를 사실처럼 내보낼 수 있다 (기획서 §3-2).
   푼 좌표는 이 기기에 적어 두어 다음엔 다시 묻지 않는다. */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from './page.module.css';
import config from '../../../data/games/trail.json';
import { earn, emptySave, loadSave, recordProgress, writeSave } from '../../../lib/baeumteo/save';

const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '';
const GEO_CACHE = 'oesol.trail.geo.v1';

/** 두 자리 사이 거리(m). 지구를 공으로 본다 */
function distanceM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function readCache() {
  try {
    return JSON.parse(window.localStorage.getItem(GEO_CACHE) || '{}') || {};
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    window.localStorage.setItem(GEO_CACHE, JSON.stringify(cache));
  } catch {
    /* 못 적어 두면 다음에 다시 묻는다 */
  }
}

/** 카카오 SDK 를 한 번만 싣는다 */
function loadKakao() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.kakao?.maps?.Map) return resolve(window.kakao);
    if (!KEY) return reject(new Error('no key'));
    const id = 'kakao-map-sdk';
    const done = () => window.kakao.maps.load(() => resolve(window.kakao));
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener('load', done);
      return undefined;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = done;
    script.onerror = () => reject(new Error('load failed'));
    document.head.appendChild(script);
    return undefined;
  });
}

/** 장소를 좌표로 푼다 (주소 찾기 또는 키워드 찾기) */
function resolveStop(kakao, stop) {
  const { services } = kakao.maps;
  return new Promise((resolve) => {
    if (stop.search.type === 'address') {
      new services.Geocoder().addressSearch(stop.search.query, (result, status) => {
        if (status === services.Status.OK && result[0]) {
          resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
        } else resolve(null);
      });
      return;
    }
    new services.Places().keywordSearch(stop.search.query, (result, status) => {
      if (status !== services.Status.OK) return resolve(null);
      const hit =
        result.find((r) => !stop.search.region || (r.address_name || '').includes(stop.search.region)) || result[0];
      resolve(hit ? { lat: Number(hit.y), lng: Number(hit.x) } : null);
    });
  });
}

export default function Trail() {
  const [save, setSave] = useState(emptySave);
  const [ready, setReady] = useState(false);
  const [mapState, setMapState] = useState('loading'); // loading | ok | nokey | failed
  const [phase, setPhase] = useState('ready'); // ready | find | quiz | done | over
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [picked, setPicked] = useState(null);
  const [msg, setMsg] = useState('');
  const [foundCount, setFoundCount] = useState(0);

  const mapEl = useRef(null);
  const kakaoRef = useRef(null);
  const map = useRef(null);
  const coords = useRef({}); // stop.id → {lat,lng}
  const marks = useRef([]); // 지도에 올린 것들. 장소가 바뀌면 걷는다
  const foundMarks = useRef([]); // 찾은 자리 표시. 끝까지 남긴다
  const phaseRef = useRef(phase);
  const indexRef = useRef(index);
  const missRef = useRef(misses);

  useEffect(() => {
    phaseRef.current = phase;
    indexRef.current = index;
    missRef.current = misses;
  }, [phase, index, misses]);

  const commit = useCallback((updater) => {
    setSave((prev) => writeSave(typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  useEffect(() => {
    setSave(loadSave());
    setReady(true);
  }, []);

  // ── 지도 ───────────────────────────────────────────────────────

  const clearMarks = () => {
    for (const m of marks.current) m.setMap(null);
    marks.current = [];
  };

  const stop = config.stops[index];

  /** 이 장소 찾기를 시작한다: 지도를 옮기고 표시를 걷는다 */
  const beginStop = useCallback((i) => {
    const kakao = kakaoRef.current;
    const target = coords.current[config.stops[i].id];
    if (!kakao || !map.current || !target) return;
    clearMarks();
    const prev = i > 0 ? coords.current[config.stops[i - 1].id] : null;
    // 바로 위에 두면 찾을 것이 없다. 앞 장소와의 가운데쯤에서 넓게 시작한다
    const center = prev
      ? { lat: (prev.lat + target.lat) / 2, lng: (prev.lng + target.lng) / 2 }
      : { lat: target.lat + 0.0025, lng: target.lng - 0.0025 };
    map.current.setLevel(config.stops[i].level);
    map.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
  }, []);

  useEffect(() => {
    if (!ready || !mapEl.current) return undefined;
    let alive = true;

    (async () => {
      let kakao;
      try {
        kakao = await loadKakao();
      } catch (e) {
        if (alive) setMapState(e.message === 'no key' ? 'nokey' : 'failed');
        return;
      }
      if (!alive) return;
      kakaoRef.current = kakao;

      // 장소 좌표를 푼다. 적어 둔 것이 있으면 그것부터
      const cache = readCache();
      for (const s of config.stops) {
        const cached = cache[s.search.query];
        const got = cached || (await resolveStop(kakao, s));
        if (!got) {
          if (alive) setMapState('failed');
          return;
        }
        coords.current[s.id] = got;
        cache[s.search.query] = got;
      }
      writeCache(cache);
      if (!alive) return;

      const first = coords.current[config.stops[0].id];
      map.current = new kakao.maps.Map(mapEl.current, {
        center: new kakao.maps.LatLng(first.lat, first.lng),
        level: 5,
      });
      map.current.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      kakao.maps.event.addListener(map.current, 'click', (e) => {
        if (phaseRef.current !== 'find') return;
        const i = indexRef.current;
        const target = coords.current[config.stops[i].id];
        const here = { lat: e.latLng.getLat(), lng: e.latLng.getLng() };
        const d = distanceM(here, target);

        if (d <= config.within_m) {
          // 찾았다. 표시를 남기고 문제로
          const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(target.lat, target.lng) });
          marker.setMap(map.current);
          const label = new kakao.maps.CustomOverlay({
            position: new kakao.maps.LatLng(target.lat, target.lng),
            content: `<div class="${styles.label}">${config.stops[i].name}</div>`,
            yAnchor: 2.2,
          });
          label.setMap(map.current);
          foundMarks.current.push(marker, label);
          clearMarks();
          setFoundCount((n) => n + 1);
          setMsg('');
          setPhase('quiz');
          return;
        }

        const n = missRef.current + 1;
        setMisses(n);
        const km = d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`;
        setMsg(`여기는 아닙니다. 그 자리에서 ${km} 떨어져 있습니다.`);

        if (n === config.circle_after) {
          const circle = new kakao.maps.Circle({
            center: new kakao.maps.LatLng(target.lat, target.lng),
            radius: config.circle_m,
            strokeWeight: 2,
            strokeColor: '#2f4a3e',
            strokeOpacity: 0.9,
            fillColor: '#2f4a3e',
            fillOpacity: 0.12,
          });
          circle.setMap(map.current);
          marks.current.push(circle);
          map.current.panTo(new kakao.maps.LatLng(target.lat, target.lng));
        }
        if (n === config.marker_after) {
          const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(target.lat, target.lng) });
          marker.setMap(map.current);
          marks.current.push(marker);
        }
      });

      if (alive) setMapState('ok');
    })();

    return () => {
      alive = false;
    };
  }, [ready]);

  // ── 흐름 ───────────────────────────────────────────────────────

  const start = () => {
    for (const m of foundMarks.current) m.setMap(null);
    foundMarks.current = [];
    setIndex(0);
    setMisses(0);
    setWrong(0);
    setPicked(null);
    setMsg('');
    setFoundCount(0);
    setPhase('find');
    beginStop(0);
  };

  const answer = (k) => {
    setPicked(k);
    if (k === stop.quiz.answer) {
      setMsg('');
      setPhase('done');
      return;
    }
    setWrong((w) => Math.min(stop.quiz.hints.length, w + 1));
    setMsg('맞지 않습니다. 힌트가 하나 열렸습니다.');
  };

  const next = () => {
    const i = index + 1;
    if (i >= config.stops.length) {
      setPhase('over');
      return;
    }
    setIndex(i);
    setMisses(0);
    setWrong(0);
    setPicked(null);
    setMsg('');
    setPhase('find');
    beginStop(i);
  };

  const finished = useRef(false);
  useEffect(() => {
    if (phase !== 'over' || finished.current) return;
    finished.current = true;
    const gained = foundCount * config.reward.per_stop + config.reward.clear;
    commit((prev) => recordProgress(earn(prev, gained), 'trail', { cleared: true, stops: foundCount }));
  }, [phase, foundCount, commit]);

  useEffect(() => {
    if (phase === 'ready') finished.current = false;
  }, [phase]);

  // ── 화면 ───────────────────────────────────────────────────────

  return (
    <div className={styles.game}>
      <div className={styles.counter}>
        <div>
          <span className={styles.muted}>찾은 곳</span>{' '}
          <b>
            {foundCount}
            <span className={styles.of}>/{config.stops.length}</span>
          </b>
        </div>
        <div className={styles.spacer} />
        <div className={styles.stageTag}>
          {phase === 'ready' || phase === 'over' ? `장소 ${config.stops.length}곳` : `${index + 1}번째 · ${stop.name}`}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mapWrap}>
          <div ref={mapEl} className={styles.map} aria-label="울산 지도" />

          {mapState === 'loading' && (
            <div className={styles.veil}>
              <div className={styles.sheet}>
                <p>지도를 불러오는 중입니다.</p>
              </div>
            </div>
          )}
          {mapState === 'nokey' && (
            <div className={styles.veil}>
              <div className={styles.sheet}>
                <h2>지도 키가 없습니다</h2>
                <p>지도 키가 설정되지 않아 이 게임을 열 수 없습니다.</p>
              </div>
            </div>
          )}
          {mapState === 'failed' && (
            <div className={styles.veil}>
              <div className={styles.sheet}>
                <h2>지도를 열지 못했습니다</h2>
                <p>인터넷이 끊겼거나 지도 서비스가 잠시 멈췄을 수 있습니다. 새로고침해 보세요.</p>
                <p className={styles.small}>
                  관리자에게: 카카오 개발자 앱에서 카카오맵 사용 설정이 켜져 있는지, 이 사이트 주소가 Web 플랫폼
                  도메인에 등록돼 있는지 확인해 주세요.
                </p>
              </div>
            </div>
          )}
          {mapState === 'ok' && phase === 'ready' && (
            <div className={styles.veil}>
              <div className={styles.sheet}>
                <h2>외솔길 탐험</h2>
                <ol className={styles.rules}>
                  <li>외솔의 자리 {config.stops.length}곳을 차례로 찾습니다. 지도를 끌고 넓히면서 글씨를 읽으세요.</li>
                  <li>그 자리라고 생각하는 곳을 누르세요. {config.within_m}m 안이면 찾은 것입니다.</li>
                  <li>못 찾으면 힌트가 열리고, 더 못 찾으면 둘레가 그려집니다. 실패는 없습니다.</li>
                  <li>찾을 때마다 짧은 문제 하나. 다 돌면 낱말 카드를 받습니다.</li>
                </ol>
                <button type="button" className={styles.big} onClick={start}>
                  출발
                </button>
              </div>
            </div>
          )}
          {phase === 'over' && (
            <div className={styles.veil}>
              <div className={styles.sheet}>
                <h2>외솔길을 다 돌았습니다</h2>
                <p>
                  {config.stops.length}곳을 찾았고 낱말 카드 {foundCount * config.reward.per_stop + config.reward.clear}장을
                  받았습니다. 답사 가는 날 이 길을 그대로 걸어 보세요.
                </p>
                <div className={styles.row}>
                  <button type="button" onClick={start}>
                    다시 돌기
                  </button>
                  <Link href="/배움터/사전편찬소">사전 편찬소로</Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          {phase === 'find' && (
            <>
              <p className={styles.panelTag}>{index + 1}번째 장소</p>
              <h2>{stop.name}</h2>
              <p>{stop.find}</p>
              {misses >= config.hint_after && (
                <ol className={styles.hints}>
                  {stop.hints.slice(0, Math.min(stop.hints.length, misses - config.hint_after + 1)).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ol>
              )}
              {msg && <p className={styles.msg}>{msg}</p>}
              <p className={styles.small}>지도 위 어디든 눌러 보세요. 헛짚어도 벌은 없습니다.</p>
            </>
          )}

          {phase === 'quiz' && (
            <>
              <p className={styles.panelTag}>찾았습니다</p>
              <h2>{stop.name}</h2>
              <p className={styles.q}>{stop.quiz.q}</p>
              <div className={styles.choices}>
                {stop.quiz.choices.map((c, k) => (
                  <button
                    key={c}
                    type="button"
                    className={picked === k ? styles.choiceOff : ''}
                    onClick={() => answer(k)}
                    disabled={picked === k}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {wrong > 0 && (
                <ol className={styles.hints}>
                  {stop.quiz.hints.slice(0, wrong).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ol>
              )}
              {msg && <p className={styles.msg}>{msg}</p>}
            </>
          )}

          {phase === 'done' && (
            <>
              <p className={styles.panelTag}>맞았습니다</p>
              <h2>{stop.name}</h2>
              <p>
                {stop.quiz.choices[stop.quiz.answer]}. {stop.done}
              </p>
              <p className={styles.small}>출처 {stop.quiz.source}</p>
              <button type="button" className={styles.big} onClick={next}>
                {index + 1 < config.stops.length ? `다음 · ${config.stops[index + 1].name}` : '탐험 마치기'}
              </button>
            </>
          )}

          {(phase === 'ready' || phase === 'over') && (
            <>
              <h2>가는 길</h2>
              <ol className={styles.route}>
                {config.stops.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ol>
              <p className={styles.small}>
                장소의 자리는 카카오 지도의 주소·장소 찾기로 가져옵니다. 답사 전에 학급에서 한 번 같이 돌아보기에
                좋습니다.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
