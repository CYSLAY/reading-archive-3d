import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, BookOpenText, MagnifyingGlass, Pause, X } from "@phosphor-icons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import booksSource from "./data/books.json";
import type { Book } from "./types";

gsap.registerPlugin(ScrollTrigger);

const books = booksSource as Book[];
const VIDEO_DURATION = 13;
const DESKTOP_VIDEO_PATH = `${import.meta.env.BASE_URL}video/edit/final-bookshelf-13s-desktop.mp4`;
const MOBILE_VIDEO_PATH = `${import.meta.env.BASE_URL}video/edit/final-bookshelf-13s-mobile.mp4`;
const FALLBACK_VIDEO_PATH = `${import.meta.env.BASE_URL}video/final-bookshelf-13s.mp4`;
const FEATURED_ENGLISH: Record<string, { title: string; author: string }> = {
  tenpercent: { title: "10% HUMAN", author: "ALANNA COLLEN" },
};

const scrollMap = [
  { progress: 0, time: 0 },
  { progress: 0.08, time: 1 },
  { progress: 0.22, time: 2.2 },
  { progress: 0.38, time: 3.5 },
  { progress: 0.48, time: 5.7 },
  { progress: 0.60, time: 8.8 },
  { progress: 0.82, time: 11 },
  { progress: 1, time: VIDEO_DURATION },
];

function mapProgressToTime(progress: number) {
  const upperIndex = scrollMap.findIndex((point) => point.progress >= progress);
  if (upperIndex <= 0) return scrollMap[0].time;
  const start = scrollMap[upperIndex - 1];
  const end = scrollMap[upperIndex];
  const local = (progress - start.progress) / (end.progress - start.progress);
  return gsap.utils.interpolate(start.time, end.time, local);
}

function mapTimeToProgress(time: number) {
  const upperIndex = scrollMap.findIndex((point) => point.time >= time);
  if (upperIndex <= 0) return scrollMap[0].progress;
  const start = scrollMap[upperIndex - 1];
  const end = scrollMap[upperIndex];
  const local = (time - start.time) / (end.time - start.time);
  return gsap.utils.interpolate(start.progress, end.progress, local);
}

function formatDate(date: string) {
  if (!date) return "阅读中";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(`${date}T00:00:00`));
}

function selectVideoPath() {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  const compactViewport = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  const constrainedNetwork = Boolean(
    connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g" || connection?.effectiveType === "3g",
  );
  return compactViewport || constrainedNetwork ? MOBILE_VIDEO_PATH : DESKTOP_VIDEO_PATH;
}

function App() {
  const experienceRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLElement>(null);
  const archiveIntroRef = useRef<HTMLDivElement>(null);
  const archiveRef = useRef<HTMLElement>(null);
  const scrollPromptRef = useRef<HTMLDivElement>(null);
  const mobileControlRef = useRef<HTMLDivElement>(null);
  const nativeMobilePlaybackRef = useRef(false);
  const videoPathRef = useRef(selectVideoPath());
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadState, setLoadState] = useState("LOADING VISUAL ARCHIVE");
  const [gateOpen, setGateOpen] = useState(false);
  const [mobileAutoPlaying, setMobileAutoPlaying] = useState(false);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [query, setQuery] = useState("");
  const featured = books[0];
  const featuredEnglish = FEATURED_ENGLISH[featured.id];
  const unlockCountdown = Math.max(0, 100 - loadProgress);

  const stopMobileTravel = () => {
    nativeMobilePlaybackRef.current = false;
    videoRef.current?.pause();
    setMobileAutoPlaying(false);
  };

  const startMobileTravel = () => {
    const video = videoRef.current;
    if (!video || !gateOpen || activeBook) return;
    nativeMobilePlaybackRef.current = true;
    setMobileAutoPlaying(true);
    void video.play().catch(() => {
      nativeMobilePlaybackRef.current = false;
      setMobileAutoPlaying(false);
    });
  };

  const filteredBooks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return books;
    return books.filter((book) => [book.title, book.author, ...book.tags].join(" ").toLowerCase().includes(keyword));
  }, [query]);

  useLayoutEffect(() => {
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => { history.scrollRestoration = previousRestoration; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let completed = false;
    let usingFallback = false;
    let minimumTimer = 0;
    let safetyTimer = 0;
    const startedAt = performance.now();
    const video = videoRef.current;
    if (!video) return;
    document.documentElement.classList.add("is-loading");

    const finishLoading = () => {
      if (cancelled || completed) return;
      const minimumWait = Math.max(0, 1400 - (performance.now() - startedAt));
      window.clearTimeout(minimumTimer);
      minimumTimer = window.setTimeout(() => {
        if (cancelled || completed) return;
        completed = true;
        video.pause();
        video.currentTime = 0;
        window.scrollTo(0, 0);
        setLoadProgress(100);
        setLoadState("ACCESS GRANTED");
      }, minimumWait);
    };

    const updateBufferedProgress = () => {
      if (completed || !Number.isFinite(video.duration) || !video.buffered.length) return;
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const mobileResource = videoPathRef.current === MOBILE_VIDEO_PATH;
      const safeBuffer = Math.min(video.duration, mobileResource ? 3.2 : 4.5);
      const progress = Math.min(96, Math.round((bufferedEnd / safeBuffer) * 96));
      setLoadProgress((current) => Math.max(current, progress));
      if (progress > 38) setLoadState("CALIBRATING CAMERA PATH");
      if (progress > 76) setLoadState("PREPARING READING ARCHIVE");
      if (bufferedEnd >= safeBuffer && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) finishLoading();
    };

    const handleCanPlayThrough = () => finishLoading();
    const handleLoadedMetadata = () => {
      setLoadProgress((current) => Math.max(current, 8));
      updateBufferedProgress();
    };
    const handleError = () => {
      if (usingFallback) {
        setLoadState("VIDEO UNAVAILABLE · RETRY");
        return;
      }
      usingFallback = true;
      videoPathRef.current = FALLBACK_VIDEO_PATH;
      setLoadState("LOADING COMPATIBILITY VIDEO");
      video.src = FALLBACK_VIDEO_PATH;
      video.load();
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("progress", updateBufferedProgress);
    video.addEventListener("canplay", updateBufferedProgress);
    video.addEventListener("canplaythrough", handleCanPlayThrough);
    video.addEventListener("error", handleError);
    video.src = videoPathRef.current;
    video.load();

    safetyTimer = window.setTimeout(() => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        finishLoading();
      } else if (!usingFallback) {
        handleError();
      }
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearTimeout(minimumTimer);
      window.clearTimeout(safetyTimer);
      document.documentElement.classList.remove("is-loading");
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("progress", updateBufferedProgress);
      video.removeEventListener("canplay", updateBufferedProgress);
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
      video.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (loadProgress < 100 || !gateRef.current) return;
    const sparks = sparksRef.current?.querySelectorAll("i") ?? [];
    const flash = sparksRef.current?.querySelectorAll("b") ?? [];
    const sparkPaths = [
      { x: 54, y: -42, rotate: -38 },
      { x: 72, y: -24, rotate: -20 },
      { x: 46, y: -10, rotate: -8 },
      { x: 82, y: 2, rotate: 2 },
      { x: 58, y: 18, rotate: 17 },
      { x: 74, y: 38, rotate: 29 },
      { x: 38, y: 48, rotate: 42 },
      { x: 48, y: -54, rotate: -47 },
      { x: 60, y: 30, rotate: 25 },
    ];
    const timeline = gsap.timeline({
      onComplete: () => {
        setGateOpen(true);
        document.documentElement.classList.remove("is-loading");
        ScrollTrigger.refresh();
      },
    });
    gsap.set(sparks, { autoAlpha: 0, x: 0, y: 0, scaleX: 0.2, scaleY: 0.75 });
    gsap.set(flash, { autoAlpha: 0, scale: 0.2 });
    timeline
      .to(lockRef.current, { scale: 1.025, duration: 0.16, ease: "power2.out" })
      .to(lockRef.current, {
        x: 14,
        y: 18,
        rotate: 30,
        transformOrigin: "48% 50%",
        duration: 0.2,
        ease: "power3.in",
      }, "+=0.16")
      .to(flash, { autoAlpha: 1, scale: 1.8, duration: 0.055, ease: "power3.out" }, "<-=0.04")
      .to(flash, { autoAlpha: 0, scale: 0.7, duration: 0.13, ease: "power2.out" })
      .to(sparks, { autoAlpha: 1, duration: 0.025, stagger: 0.012 }, "<-=0.17")
      .to(sparks, {
        autoAlpha: 0,
        x: (index) => sparkPaths[index]?.x ?? 48,
        y: (index) => sparkPaths[index]?.y ?? 0,
        rotate: (index) => sparkPaths[index]?.rotate ?? 0,
        scaleX: (index) => 0.75 + (index % 3) * 0.34,
        duration: 0.24,
        ease: "power2.out",
        stagger: 0.012,
      }, "<-=0.025")
      .to(lockRef.current, {
        x: () => window.innerWidth * 0.08,
        y: () => window.innerHeight * 1.08,
        rotate: 30,
        duration: 0.78,
        ease: "power4.in",
      }, "+=0.07")
      .to(gateRef.current, { autoAlpha: 0, duration: 0.92, ease: "power2.inOut", pointerEvents: "none" }, "-=0.3")
      .fromTo([scrollPromptRef.current, mobileControlRef.current], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5 });
    return () => { timeline.kill(); };
  }, [loadProgress]);

  useEffect(() => {
    const experience = experienceRef.current;
    const video = videoRef.current;
    if (!experience || !video || !gateOpen || !archiveRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      video.currentTime = VIDEO_DURATION;
      gsap.set(archiveRef.current, { autoAlpha: 1, pointerEvents: "auto" });
      return;
    }

    const context = gsap.context(() => {
      gsap.set(noteRef.current, { autoAlpha: 0, x: 28 });
      gsap.set(archiveIntroRef.current, { autoAlpha: 0, y: 18 });
      gsap.set(archiveRef.current, { autoAlpha: 0, y: 26, pointerEvents: "none" });
      const bookCards = gsap.utils.toArray<HTMLButtonElement>(".book-index button", archiveRef.current ?? undefined);
      const bookIndex = archiveRef.current!.querySelector<HTMLElement>(".book-index")!;
      gsap.set(bookCards, { autoAlpha: 0, scale: 0.94, clipPath: "inset(42% 18% 42% 18%)" });
      gsap.set(bookIndex, { overflowY: "hidden", pointerEvents: "none" });
      const playhead = { time: 0 };
      const mobileViewport = window.matchMedia("(max-width: 900px)").matches;
      let lastMobileSeekAt = 0;
      const seek = gsap.quickTo(playhead, "time", {
        duration: mobileViewport ? 0.14 : 0.22,
        ease: "power1.out",
        onUpdate: () => {
          if (nativeMobilePlaybackRef.current) {
            playhead.time = video.currentTime;
            return;
          }
          const now = performance.now();
          if (mobileViewport && now - lastMobileSeekAt < 40) return;
          if (video.readyState >= 1 && Math.abs(video.currentTime - playhead.time) > 0.018) {
            lastMobileSeekAt = now;
            video.currentTime = playhead.time;
          }
        },
        onComplete: () => {
          if (!nativeMobilePlaybackRef.current && video.readyState >= 1 && Math.abs(video.currentTime - playhead.time) > 0.018) {
            video.currentTime = playhead.time;
          }
        },
      });

      const irregularOrder = [0, 6, 13, 3, 18, 9, 1, 15, 5, 20, 11, 2, 17, 7, 22, 4, 14, 8, 19, 10, 23, 12, 21, 16, 24];
      const archiveReveal = gsap.timeline({
        paused: true,
        onComplete: () => {
          gsap.set(archiveRef.current, { pointerEvents: "auto" });
          gsap.set(bookIndex, { overflowY: "auto", pointerEvents: "auto" });
        },
      });
      archiveReveal
        .to(archiveRef.current, { autoAlpha: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0);
      irregularOrder
        .filter((index) => index < bookCards.length)
        .forEach((index, step) => {
          archiveReveal.to(bookCards[index], {
            autoAlpha: 1,
            scale: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.18,
            ease: "power2.out",
          }, 0.08 + step * 0.022);
        });
      let archiveStarted = false;
      let archiveHideTween: gsap.core.Tween | null = null;

      const resetArchive = () => {
        archiveReveal.pause(0);
        gsap.set(archiveRef.current, { autoAlpha: 0, y: 26, pointerEvents: "none" });
        gsap.set(bookCards, { autoAlpha: 0, scale: 0.94, clipPath: "inset(42% 18% 42% 18%)" });
        gsap.set(bookIndex, { overflowY: "hidden", pointerEvents: "none" });
      };

      ScrollTrigger.create({
        trigger: experience,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.55,
        invalidateOnRefresh: true,
        onUpdate: ({ progress }) => {
          if (nativeMobilePlaybackRef.current) {
            playhead.time = video.currentTime;
          } else {
            seek(mapProgressToTime(progress));
          }
          gsap.set(".progress-line", { scaleX: progress });
          if (scrollPromptRef.current) gsap.set(scrollPromptRef.current, { autoAlpha: progress < 0.025 ? 1 : 0 });
          if (mobileControlRef.current) {
            gsap.set(mobileControlRef.current, {
              autoAlpha: progress < 0.998 ? 1 : 0,
              pointerEvents: progress < 0.998 ? "auto" : "none",
            });
          }
          if (progress >= 0.999 && !archiveStarted) {
            archiveStarted = true;
            archiveHideTween?.kill();
            resetArchive();
            video.currentTime = VIDEO_DURATION;
            archiveReveal.play(0);
          } else if (progress < 0.995 && archiveStarted) {
            archiveStarted = false;
            archiveReveal.pause();
            gsap.set(archiveRef.current, { pointerEvents: "none" });
            gsap.set(bookIndex, { overflowY: "hidden", pointerEvents: "none" });
            archiveHideTween = gsap.to(archiveRef.current, {
              autoAlpha: 0,
              duration: 0.22,
              ease: "power2.out",
              onComplete: resetArchive,
            });
          }
        },
      });

      const ui = gsap.timeline({
        scrollTrigger: { trigger: experience, start: "top top", end: "bottom bottom", scrub: 0.5 },
      });
      ui
        .to(noteRef.current, { autoAlpha: 1, x: 0, duration: 0.045 }, 0.46)
        .to(noteRef.current, { autoAlpha: 1, duration: 0.015 }, 0.505)
        .to(noteRef.current, { autoAlpha: 0, x: -22, duration: 0.03 }, 0.52)
        .to(archiveIntroRef.current, { autoAlpha: 1, y: 0, duration: 0.025 }, 0.865)
        .to(archiveIntroRef.current, { autoAlpha: 1, duration: 0.095 }, 0.89)
        .to(archiveIntroRef.current, { autoAlpha: 0, y: -12, duration: 0.014 }, 0.985)
        .to({}, { duration: 0.001 }, 0.999);
    }, experience);
    return () => context.revert();
  }, [gateOpen]);

  useEffect(() => {
    if (!mobileAutoPlaying || !gateOpen || activeBook) return;
    if (!window.matchMedia("(max-width: 900px)").matches) return;

    const video = videoRef.current;
    if (!video) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    let animationFrame = 0;
    let videoFrame = 0;
    let cancelled = false;
    let lastFallbackSyncAt = 0;
    const supportsVideoFrameCallback = typeof video.requestVideoFrameCallback === "function";

    const advance = (now = performance.now()) => {
      if (cancelled) return;
      if (!supportsVideoFrameCallback && now - lastFallbackSyncAt < 32) {
        animationFrame = window.requestAnimationFrame(advance);
        return;
      }
      lastFallbackSyncAt = now;
      const progress = mapTimeToProgress(Math.min(VIDEO_DURATION, video.currentTime));
      window.scrollTo(0, Math.min(maxScroll, progress * maxScroll));
      if (video.ended || video.currentTime >= VIDEO_DURATION - 0.02) {
        window.scrollTo(0, maxScroll);
        stopMobileTravel();
        return;
      }
      if (supportsVideoFrameCallback) {
        videoFrame = video.requestVideoFrameCallback(advance);
      } else {
        animationFrame = window.requestAnimationFrame(advance);
      }
    };

    if (video.paused) void video.play().catch(stopMobileTravel);
    advance();
    return () => {
      cancelled = true;
      if (videoFrame && typeof video.cancelVideoFrameCallback === "function") video.cancelVideoFrameCallback(videoFrame);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      video.pause();
      nativeMobilePlaybackRef.current = false;
    };
  }, [activeBook, gateOpen, mobileAutoPlaying]);

  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) stopMobileTravel(); };
    window.addEventListener("blur", stopMobileTravel);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("blur", stopMobileTravel);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, []);

  useEffect(() => {
    if (!activeBook) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setActiveBook(null);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeBook]);

  return (
    <main id="top">
      <section className="experience" ref={experienceRef} aria-label="私人阅读档案漫游">
        <div className="viewport">
          <video ref={videoRef} className="scene-video" muted playsInline preload="auto" poster={`${import.meta.env.BASE_URL}video/final-bookshelf-v3-first-frame.png`} aria-label="时间静止的机械阅读档案馆" />
          <div className="scene-scrim" />

          <header className="site-header">
            <a className="brand" href="#top">READING ARCHIVE <span>/ 私人读书档案</span></a>
            <p><span className="status-dot" /> TIME SUSPENDED · {books.length} RECORDS</p>
          </header>

          <div className="scroll-progress" aria-hidden="true"><i className="progress-line" /></div>
          <div className="chapter-code" aria-hidden="true">ARCHIVE / 2026<br />SECTOR 01</div>

          <article className="featured-note" ref={noteRef}>
            <p className="eyebrow">CURRENT RECORD · {formatDate(featured.finishedAt)}</p>
            <h1 lang="en">{featuredEnglish?.title ?? featured.title}</h1>
            {featuredEnglish && <p className="featured-title-cn">{featured.title}</p>}
            <p className="featured-author">{featuredEnglish?.author ?? featured.author}</p>
            <blockquote>{featured.summary}</blockquote>
            <button type="button" onClick={() => setActiveBook(featured)}>
              阅读完整笔记 <ArrowUpRight size={17} weight="bold" />
            </button>
          </article>

          <div className="archive-intro" ref={archiveIntroRef}>
            <p>THE COMPLETE COLLECTION</p>
            <h2>所有读过的书，<br />都留在这里。</h2>
            <span>{books.length.toString().padStart(2, "0")} BOOKS / 2026</span>
          </div>

          <section className="archive-panel" ref={archiveRef} aria-label="全部阅读记录">
            <div className="archive-heading">
              <div>
                <p>READING INDEX / 完整档案</p>
                <h2>书架记录</h2>
              </div>
              <label className="archive-search">
                <MagnifyingGlass size={16} aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书名、作者或标签" />
              </label>
              <span>{filteredBooks.length.toString().padStart(2, "0")} / {books.length.toString().padStart(2, "0")}</span>
            </div>
            <div className="book-index">
              {filteredBooks.map((book, index) => (
                <button key={book.id} type="button" onClick={() => setActiveBook(book)}>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <span>{book.title}</span>
                  <em>{book.author}</em>
                  <time>{formatDate(book.finishedAt)}</time>
                </button>
              ))}
            </div>
          </section>

          <div className="scroll-prompt" ref={scrollPromptRef}>
            <span>SCROLL TO ENTER</span><ArrowDown size={17} />
          </div>

          <div className={`mobile-travel-control${mobileAutoPlaying ? " is-playing" : ""}`} ref={mobileControlRef}>
            <p aria-live="polite">{mobileAutoPlaying ? "松开即停" : "按住圆环继续"}</p>
            <button
              type="button"
              aria-label="按住圆环继续浏览，松开停止"
              aria-pressed={mobileAutoPlaying}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                startMobileTravel();
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                stopMobileTravel();
              }}
              onPointerCancel={stopMobileTravel}
              onLostPointerCapture={stopMobileTravel}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") startMobileTravel();
              }}
              onKeyUp={(event) => {
                if (event.key === " " || event.key === "Enter") stopMobileTravel();
              }}
              onContextMenu={(event) => event.preventDefault()}
            >
              {mobileAutoPlaying ? <Pause size={23} weight="fill" /> : <ArrowDown size={24} weight="bold" />}
            </button>
            <small>{mobileAutoPlaying ? "HOLDING TO ADVANCE" : "PRESS AND HOLD"}</small>
          </div>

          <div className="loading-gate" ref={gateRef} aria-live="polite">
            <div className="password-lock" ref={lockRef}>
              <img className="lock-shell" src={`${import.meta.env.BASE_URL}gate/security-lock-v4.png`} alt="" aria-hidden="true" />
              <div className="lock-sparks" ref={sparksRef} aria-hidden="true">
                <b />
                {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
              </div>
              <div className="lock-screen">
                <div className="digit-window" aria-label={`解锁倒数 ${unlockCountdown}`}>
                  {String(unlockCountdown).padStart(3, "0").split("").map((digit, index) => <i key={`${index}-${digit}`}>{digit}</i>)}
                </div>
                <p>{loadState}</p>
                <div className="load-track"><i style={{ transform: `scaleX(${loadProgress / 100})` }} /></div>
                <span>T - {unlockCountdown.toString().padStart(3, "0")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeBook && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setActiveBook(null)}>
          <article className="note-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="dialog-close" type="button" onClick={() => setActiveBook(null)} aria-label="关闭笔记"><X size={20} /></button>
            <div className="dialog-index"><BookOpenText size={18} /><span>READING RECORD / {formatDate(activeBook.finishedAt)}</span></div>
            <h2 id="dialog-title">{activeBook.title}</h2>
            <p className="dialog-meta">{[activeBook.author, activeBook.publisher].filter(Boolean).join(" / ")}</p>
            <p className="dialog-summary">{activeBook.summary}</p>
            <div className="dialog-tags">{activeBook.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            {activeBook.contentHtml ? <div className="dialog-body" dangerouslySetInnerHTML={{ __html: activeBook.contentHtml }} /> : <p className="dialog-empty">完整笔记正在归档，当前先保留阅读摘要。</p>}
          </article>
        </div>
      )}
    </main>
  );
}

export default App;
