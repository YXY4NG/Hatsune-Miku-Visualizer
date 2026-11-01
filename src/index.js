import { Player } from "textalive-app-api";
import coffeeImg from "./sketches/coffee-data.js";
import windowImg from "./sketches/window-data.js";
import curtainsImg from "./sketches/curtains-data.js";
import coverSketchImg from "./sketches/cover-sketch-data.js";
import finSketchImg from "./sketches/fin-sketch-data.js";
const $ = window.jQuery;

// ---- Config ----
const SONG_URL = "https://piapro.jp/t/zoqO/20251214200738";
const APP_TOKEN = "1HJzpsZ11CfoUPrr";

// ---- Page splits (ms) ----
const pages = [
  { start: 0,      end: 28000,    label: "其の一" },
  { start: 28000,  end: 41000,    label: "其の二" },
  { start: 41000,  end: 70000,    label: "其の三" },
  { start: 70000,  end: 111000,   label: "其の四" },
  { start: 111000, end: 141000,   label: "其の五" },
  { start: 141000, end: 168000,   label: "其の六" },
  { start: 168000, end: 191000,   label: "其の七" },
  { start: 191000, end: 218000,   label: "其の八" },
  { start: 218000, end: 99999999, label: "其の九" },
];

// ---- Sketches on the left page of each spread (one per 3 lyric pages) ----
const spreadSketches = [
  { src: curtainsImg, alt: "Miku curtains sketch",    marginTop: "10%" },
  { src: windowImg,   alt: "Miku at window sketch",   marginTop: "15%" },
  { src: coffeeImg,   alt: "coffee latte art sketch", marginTop: "10%" },
];

// Sketch for the spread whose right-hand page is lyric page `pageIdx`
function sketchHtml(pageIdx) {
  const s = spreadSketches[Math.floor(pageIdx / 3)];
  return `<img class="sketch" src="${s.src}" alt="${s.alt}" style="width:285px;height:auto;margin-top:${s.marginTop}">`;
}

let revealedChars = new Set();
let ignoreTicksUntil = 0;


// ---- DOM refs ----
const positionEl  = document.querySelector("#position strong");
const artistSpan  = document.querySelector("#artist span");
const songSpan    = document.querySelector("#song span");
const seekbar     = document.querySelector("#seekbar");
const playBtn     = document.querySelector("#play");
const pauseBtn    = document.querySelector("#pause");
const rewindBtn   = document.querySelector("#rewind");
const pageLabel   = document.querySelector("#page-label");
const prevPageBtn = document.querySelector("#prev-page");
const nextPageBtn = document.querySelector("#next-page");

// ---- State ----
let songDuration     = 0;
let currentPageIndex = -1;
let flipbookReady    = false;
let playerReady      = false;
let bookOpened       = false;
let bookSettled      = false;
let awaitingStart    = false;
let revealedSpans = [];
let shownSketches = [];
let catchUpPending = false;   // after a seek, hold lyric reveals until the flip ends
let catchUpTimer   = null;
let sweepTimers    = [];
let sweepQueue     = [];

// ---- Fit lyrics into their page box ----
// Available area after layout changes in CSS:
//   height: 500 - 48(top pad) - 48(label slot) - 24(bot pad) = 380px
//   width:  400 - 56(left pad) - 32(right pad)               = 312px
// Keep in sync with .page-content padding in index.css.
function fitLyrics() {
  const MAX_H = 380;
  const MAX_W = 312;

  const ruler = document.createElement("p");
  Object.assign(ruler.style, {
    position:    "fixed",
    top:         "-9999px",
    left:        "-9999px",
    width:       MAX_W + "px",
    fontFamily:  "'Klee One', cursive",
    fontWeight:  "400",
    whiteSpace:  "normal",
    wordBreak:   "break-word",
    margin:      "0",
    padding:     "0",
    visibility:  "hidden",
  });
  document.body.appendChild(ruler);

  document.querySelectorAll(".lyric").forEach((el) => {
    ruler.innerHTML = el.innerHTML;

    // Step down from 1.6rem until the text fits, minimum 0.72rem.
    // Line-height is kept as a multiple of 3rem (the rule grid) where possible,
    // but at small sizes we simply use a tight proportional value.
    for (let s = 1.6; s >= 0.72; s = Math.round((s - 0.04) * 100) / 100) {
      // At 1.6rem, one rule slot (3rem = 48px) comfortably holds the line.
      // At 0.72rem, we tighten to 1.15× to avoid wasted space.
      const t  = (s - 0.72) / (1.6 - 0.72);
      const lh = +(s * (1.15 + t * (1.5 - 1.15))).toFixed(3);
      ruler.style.fontSize   = s  + "rem";
      ruler.style.lineHeight = lh + "rem";

      if (ruler.scrollHeight <= MAX_H) {
        el.style.fontSize   = s  + "rem";
        el.style.lineHeight = lh + "rem";
        return;
      }
    }

    // Fallback — absolute minimum
    el.style.fontSize   = "0.72rem";
    el.style.lineHeight = "1rem";
  });

  document.body.removeChild(ruler);
}

// ---- Show page ----

function showPage(index) {
  if (index < 0 || index >= pages.length) return;
  currentPageIndex = index;

  if (flipbookReady) {
    const target = index * 2 + 3;
    if ($("#flipbook").turn("page") !== target) {
      $("#flipbook").turn("page", target);
    }
  }

  if (pageLabel)   pageLabel.textContent  = `${index + 1} / ${pages.length}`;
  if (prevPageBtn) prevPageBtn.disabled   = index === 0;
  if (nextPageBtn) nextPageBtn.disabled   = index === pages.length - 1;
}

function pageIndexAt(position) {
  return pages.findIndex((pg) => position >= pg.start && position < pg.end);
}

// ---- Seek catch-up: flip in blank, then fade the sketch and re-write the lyrics ----

// Remove a class without its fade (for pages that are off-screen)
function hideNow(el, cls) {
  el.style.transition = "none";
  el.classList.remove(cls);
  void el.offsetWidth;
  el.style.transition = "";
}

// Blank out a lyric page and its facing sketch before flipping to it
function hidePage(index) {
  const lyric = document.getElementById(`lyric-${index}`);
  if (lyric) {
    const starts = new Set();
    lyric.querySelectorAll("span.char").forEach((s) => {
      starts.add(parseFloat(s.dataset.start));
      hideNow(s, "visible");
    });
    revealedSpans = revealedSpans.filter((s) => !lyric.contains(s));
    revealedChars.forEach((c) => {
      if (starts.has(c.startTime)) revealedChars.delete(c);
    });
  }
  const sk = document.querySelector(`.page.blank[data-sketch-index="${index - 1}"] .sketch`);
  if (sk) {
    hideNow(sk, "shown");
    shownSketches = shownSketches.filter((s) => s !== sk);
  }
}

// Finish any running sweep at once
function cancelSweep() {
  sweepTimers.forEach(clearTimeout);
  sweepTimers = [];
  sweepQueue.forEach((s) => s.classList.add("visible"));
  sweepQueue = [];
}

function startCatchUp() {
  catchUpPending = true;
  if (!catchUpTimer) catchUpTimer = setInterval(checkCatchUp, 100);
}

function stopCatchUp() {
  cancelSweep();
  clearInterval(catchUpTimer);
  catchUpTimer   = null;
  catchUpPending = false;
}

// Polls until the book has flipped to the page for the current position
function checkCatchUp() {
  if (!bookOpened || !bookSettled) return stopCatchUp();
  const position = player.timer.position;
  const index    = pageIndexAt(position);
  if (index !== currentPageIndex) showPage(index);
  if ($("#flipbook").turn("animating")) return;
  clearInterval(catchUpTimer);
  catchUpTimer = null;
  sweepLyrics(position);
}

// Reveal every char sung so far: a quick write-on for the visible page,
// instantly for pages that are off-screen
function sweepLyrics(position) {
  const onPage = [];
  for (let c = player.video.firstChar; c && c.startTime <= position; c = c.next) {
    if (revealedChars.has(c)) continue;
    revealedChars.add(c);
    document.querySelectorAll(`span.char[data-start="${c.startTime}"]`).forEach((s) => {
      revealedSpans.push(s);
      if (s.closest(`#lyric-${currentPageIndex}`)) onPage.push(s);
      else s.classList.add("visible");
    });
  }

  // ~1s for a full page, at most 60ms per char
  const step = Math.min(60, 1000 / Math.max(onPage.length, 1));
  sweepQueue = onPage;
  onPage.forEach((s, i) => {
    sweepTimers.push(setTimeout(() => s.classList.add("visible"), i * step));
  });
  sweepTimers.push(setTimeout(() => {
    sweepTimers    = [];
    sweepQueue     = [];
    catchUpPending = false;
  }, onPage.length * step));
}

// ---- Open book and start playback ----
function openAndPlay() {
  if (!playerReady || bookOpened) return;
  bookOpened = true;
  bookSettled = false;
  ignoreTicksUntil = Date.now() + 700;
  const book = $("#flipbook");

  book.css({ transition: "opacity 0.25s ease", opacity: 0 });
  setTimeout(() => {
    book.turn("display", "double");
    book.turn("size", 800, 500);
    book.turn("page", 3);
    book.css("opacity", 1);
    bookSettled = true;          // book is genuinely ready now
    awaitingStart = true;
    player.requestPlay();
  }, 250);
}

// ---- Collapse to the lone back cover (mirror of openAndPlay) ----
function showBackCover() {
  if (!flipbookReady) return;
  if (pageLabel) pageLabel.textContent = "";
  const book = $("#flipbook");

  book.css({ transition: "opacity 0.25s ease", opacity: 0 });   // fade out
  setTimeout(() => {
    book.turn("display", "single");
    book.turn("size", 400, 500);              // shrink to one page
    book.turn("page", book.turn("pages"));    // land on Fin, alone and centered
    book.css("opacity", 1);                   // fade back in
  }, 250);
}

// ---- TextAlive Player ----
const player = new Player({
  app: { token: APP_TOKEN },
  mediaElement: document.querySelector("#media"),
});

player.addListener({
  onAppReady,
  onVideoReady,
  onTimerReady,
  onThrottledTimeUpdate,
  onPlay,
  onPause,
  onStop,
});

function onAppReady(app) {
  if (!app.managed) {
    document.querySelector("#control").style.display = "flex";

    playBtn.addEventListener("click", () => {
      ignoreTicksUntil = 0;
      awaitingStart    = false;
      if (!playerReady) return;
      bookOpened ? player.requestPlay() : openAndPlay();
      
    });

    pauseBtn.addEventListener("click", () => {
      if (player.video) player.requestPause();
    });

    rewindBtn.addEventListener("click", () => {
      if (!player.video) return;
      ignoreTicksUntil = Date.now() + 400;
      player.requestPause();
      player.requestMediaSeek(0);
      stopCatchUp();

      seekbar.value = 0;
      positionEl.textContent = "0";
      revealedSpans.forEach((s) => s.classList.remove("visible"));
      revealedSpans = [];
      revealedChars.clear();
      shownSketches.forEach((s) => s.classList.remove("shown"));
      shownSketches = [];

      bookOpened       = false;
      bookSettled      = false;
      awaitingStart    = false;
      currentPageIndex = -1;
      if (pageLabel) pageLabel.textContent = "";
      if (!flipbookReady) return;

      const book = $("#flipbook");
      book.css({ transition: "opacity 0.25s ease", opacity: 0 });
      setTimeout(() => {
        book.turn("display", "single");
        book.turn("size", 400, 500);
        book.turn("page", 1);
        book.css("opacity", 1);
      }, 250);
    });

    seekbar.addEventListener("input", () => {
      if (!player.video || songDuration <= 0) return;
      const seekTo = (seekbar.value / 100) * songDuration;
      cancelSweep();

      revealedSpans = revealedSpans.filter((s) => {
        if (parseFloat(s.dataset.start) > seekTo) {
          s.classList.remove("visible");
          return false;
        }
        return true;
      });
      revealedChars.forEach((c) => {
        if (c.startTime > seekTo) revealedChars.delete(c);
      });

      shownSketches = shownSketches.filter((sk) => {
        const blank = sk.closest(".page.blank");
        const idx = blank ? parseInt(blank.dataset.sketchIndex, 10) : -1;
        const section = pages[idx + 1];
        if (idx >= 0 && section && seekTo < section.start) {
          sk.classList.remove("shown");
          return false;
        }
        return true;
      });

      // Landing on another page: flip to it blank, then fade it in
      if (bookOpened) {
        const landing = pageIndexAt(seekTo);
        if (landing !== currentPageIndex) hidePage(landing);
        startCatchUp();
      }

      player.requestMediaSeek(seekTo);
    });

    prevPageBtn.addEventListener("click", () => {
      if (currentPageIndex > 0)
        player.requestMediaSeek(pages[currentPageIndex - 1].start);
    });

    nextPageBtn.addEventListener("click", () => {
      if (currentPageIndex < pages.length - 1)
        player.requestMediaSeek(pages[currentPageIndex + 1].start);
    });
  }

  if (!app.songUrl) player.createFromSongUrl(SONG_URL);
}

function onVideoReady() {
  artistSpan.textContent = player.data.song.artist.name;
  songSpan.textContent   = player.data.song.name;
  songDuration           = player.video.duration;

  const flipbook     = document.getElementById("flipbook");
  const hardPages    = [...flipbook.querySelectorAll(".hard")];
  const insertBefore = hardPages[hardPages.length - 2];

  // Build lyric page divs (each lyric page is paired with a blank back)
  pages.forEach((page, i) => {
    const div = document.createElement("div");
    div.className = "page";
    div.innerHTML = `
      <div class="page-content">
        <p class="page-section">${page.label}</p>
        <p class="lyric" id="lyric-${i}"></p>
      </div>`;
    flipbook.insertBefore(div, insertBefore);

    const blank = document.createElement("div");
    blank.className = "page blank";
    blank.dataset.sketchIndex = i;
    // Blank i faces lyric page i + 1; the last one faces the empty end spread
    if (i + 1 < pages.length) blank.innerHTML = sketchHtml(i + 1);
    flipbook.insertBefore(blank, insertBefore);
  });

  const coverImg = document.createElement("img");
  coverImg.src = coverSketchImg;
  coverImg.className = "cover-emblem";
  coverImg.alt = "Miku cover sketch";
  document.querySelector(".cover-front").appendChild(coverImg);
  const coverImgBack = document.createElement("img");
  coverImgBack.src = finSketchImg;
  coverImgBack.className = "cover-emblem";
  coverImgBack.alt = "Miku cover sketch";
  document.querySelector(".cover-back").appendChild(coverImgBack);

  // --- Extra blank spread after the last lyric page ---
  // Turn.js works in page pairs; insert two blank pages so the
  // final spread before "Fin." is completely empty.
  const blankEndA = document.createElement("div");
  blankEndA.className = "page blank";
  flipbook.insertBefore(blankEndA, insertBefore);

  const blankEndB = document.createElement("div");
  blankEndB.className = "page blank";
  flipbook.insertBefore(blankEndB, insertBefore);

  const introBlank = hardPages[1];
  introBlank.classList.remove("hard");
  introBlank.classList.add("page", "blank");
  // Faces lyric page 0; index -1 so seeking maps it to pages[0]
  introBlank.dataset.sketchIndex = -1;
  introBlank.innerHTML = sketchHtml(0);

  // Populate lyrics character by character
  let lastPhrasePage = -1;
  let char = player.video.firstChar;
  while (char) {
    const phraseStart = char.parent?.parent?.startTime ?? char.startTime;
    const pageIdx = pages.findIndex(
      (pg) => phraseStart >= pg.start && phraseStart < pg.end
    );
    if (pageIdx !== -1) {
      const el = document.getElementById(`lyric-${pageIdx}`);
      if (el) {
        const curPhrase  = char.parent?.parent;
        const prevPhrase = char.previous?.parent?.parent;
        if (lastPhrasePage === pageIdx && curPhrase !== prevPhrase) {
          el.appendChild(document.createElement("br"));
        }
        const span = document.createElement("span");
        span.className     = "char";
        span.textContent   = char.text;
        span.dataset.start = char.startTime;
        el.appendChild(span);
        lastPhrasePage = pageIdx;
      }
    }
    char = char.next;
  }

  // Init Turn.js
  $("#flipbook").turn({
    width:        400,
    height:       500,
    autoCenter:   true,
    display:      "single",
    acceleration: true,
    gradients:    true,
    duration:     1500,
    turnCorners:  "",
  });

  flipbookReady = true;
  document.getElementById("flipbook").classList.add("ready");
  document.getElementById("loading").classList.add("hidden");

  $("#flipbook").turn("disable", true);

  $("#flipbook").on("click", ".hard", function () {
    if ($("#flipbook").turn("page") === 1) openAndPlay();
  });
}

function revealVisibleSketches() {
    const view = $("#flipbook").turn("view");   // array of page numbers in the current spread
    view.forEach((p) => {
      const blank = document.querySelector(`.page.blank[data-sketch-index]`);
      document.querySelectorAll(".page.blank").forEach((b) => {
        if (b.querySelector(".sketch")) {
          const r = b.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            const sk = b.querySelector(".sketch");
            sk.classList.add("shown");
            shownSketches.push(sk);
          }
        }
      });
    });
  }

  $("#flipbook").bind("turned", revealVisibleSketches);

function onTimerReady() {
  playerReady = true;
  document.querySelectorAll("button, input").forEach((el) => (el.disabled = false));
  prevPageBtn.disabled = true;
  nextPageBtn.disabled = true;
}

function onThrottledTimeUpdate(position) {
  if (awaitingStart) {
    if (position > 2000) return;   // stale resume position — swallow it
    awaitingStart = false;         // reached the actual start; proceed normally
  }
  if (Date.now() < ignoreTicksUntil) return;
  positionEl.textContent = String(Math.floor(position));
  if (songDuration > 0) seekbar.value = (position / songDuration) * 100;

  // Reveal chars on time (held while a seek catch-up is running)
  if (player.video && !catchUpPending) {
    let c = player.video.firstChar;
    while (c) {
      if (c.startTime <= position && !revealedChars.has(c)) {
        document
          .querySelectorAll(`span.char[data-start="${c.startTime}"]`)
          .forEach((s) => {
            s.classList.add("visible");
            revealedSpans.push(s);
          });
        revealedChars.add(c);
      } else if (c.startTime > position) {
        break;
      }
      c = c.next;
    }
  }

  if (!bookOpened || !bookSettled) return;

  // End of song → jump to Fin page
  if (songDuration > 0 && position >= songDuration - 500) {
    bookOpened       = false;
    currentPageIndex = -1;
    showBackCover();
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    return;
  }

  for (let i = 0; i < pages.length; i++) {
    if (position >= pages[i].start && position < pages[i].end) {
      if (i !== currentPageIndex) showPage(i);
      break;
    }
  }
}

function onPlay()  {}

function onPause() {}

function onStop() {
  stopCatchUp();
  currentPageIndex = -1;
  bookOpened       = false;
  bookSettled      = false;
  awaitingStart    = false;
  revealedChars.clear();
  shownSketches.forEach((s) => s.classList.remove("shown"));
  shownSketches = [];
  revealedSpans.forEach((s) => s.classList.remove("visible"));
  revealedSpans = [];
  if (flipbookReady) showBackCover();
}