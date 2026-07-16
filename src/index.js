import { Player } from "textalive-app-api";
import coffeeImg from "./sketches/coffee-data.js";
import windowImg from "./sketches/window-data.js";
import curtainsImg from "./sketches/curtains-data.js";
import coverSketchImg from "./sketches/cover-sketch-data.js";
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

      document.querySelectorAll(".page.blank[data-sketch-index]").forEach((b) => {
        const sk = b.querySelector(".sketch");
        if (!sk || sk.classList.contains("shown")) return;
        const idx = parseInt(b.dataset.sketchIndex, 10);
        const section = pages[idx + 1];
        if (section && seekTo >= section.start) {
          sk.classList.add("shown");
          shownSketches.push(sk);
        }
      });

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
    if (i === 1) blank.innerHTML = `<img class="sketch" src="${curtainsImg}" alt="Miku curtains sketch" style="width:285px;height:auto;margin-top:10%">`;
    if (i === 2) blank.innerHTML = `<img class="sketch" src="${windowImg}" alt="Miku at window sketch" style="width:285px;height:auto;margin-top:15%">`;
    if (i === 3) blank.innerHTML = `<img class="sketch" src="${coffeeImg}" alt="coffee latte art sketch" style="width:285px;height:auto;margin-top:10%">`;
    flipbook.insertBefore(blank, insertBefore);
  });

  const coverImg = document.createElement("img");
  coverImg.src = coverSketchImg;
  coverImg.className = "cover-emblem";
  coverImg.alt = "Miku cover sketch";
  document.querySelector(".cover-front").appendChild(coverImg);
  const coverImgBack = document.createElement("img");
  coverImgBack.src = coverSketchImg;
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

  // Reveal chars on time
  if (player.video) {
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