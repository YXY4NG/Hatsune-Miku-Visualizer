import { Player } from "textalive-app-api";
const $ = window.jQuery;

// ---- Config ----
const SONG_URL = "https://piapro.jp/t/zoqO/20251214200738";
const APP_TOKEN = "1HJzpsZ11CfoUPrr";

// ---- Page splits (ms) ----
const pages = [
  { start: 0,      end: 28000,    label: "Intro"    },
  { start: 28000,  end: 41000,    label: "Verse 1"  },
  { start: 41000,  end: 70000,    label: "Verse 2"  },
  { start: 70000,  end: 111000,   label: "Chorus 1" },
  { start: 111000, end: 141000,   label: "Verse 3"  },
  { start: 141000, end: 168000,   label: "Chorus 2" },
  { start: 168000, end: 191000,   label: "Verse 4"  },
  { start: 191000, end: 218000,   label: "Chorus 3" },
  { start: 218000, end: 99999999, label: "Verse 5"  },
];

let revealedChars = new Set();

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
  $("#flipbook").turn("page", 3);
  player.requestPlay();
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
      if (!playerReady) return;
      bookOpened ? player.requestPlay() : openAndPlay();
    });

    pauseBtn.addEventListener("click", () => {
      if (player.video) player.requestPause();
    });

    rewindBtn.addEventListener("click", () => {
      if (!player.video) return;
      player.requestPause();
      player.requestMediaSeek(0);
      bookOpened       = false;
      currentPageIndex = -1;
      if (flipbookReady) $("#flipbook").turn("page", 1);
    });

    seekbar.addEventListener("input", () => {
      if (!player.video || songDuration <= 0) return;
      const seekTo = (seekbar.value / 100) * songDuration;

      document.querySelectorAll("span.char.visible").forEach((s) => {
        if (parseFloat(s.dataset.start) > seekTo) s.classList.remove("visible");
      });
      revealedChars.forEach((c) => {
        if (c.startTime > seekTo) revealedChars.delete(c);
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
    flipbook.insertBefore(blank, insertBefore);
  });

  // --- Extra blank spread after the last lyric page ---
  // Turn.js works in page pairs; insert two blank pages so the
  // final spread before "Fin." is completely empty.
  const blankEndA = document.createElement("div");
  blankEndA.className = "page blank";
  flipbook.insertBefore(blankEndA, insertBefore);

  const blankEndB = document.createElement("div");
  blankEndB.className = "page blank";
  flipbook.insertBefore(blankEndB, insertBefore);

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
    width:        800,
    height:       500,
    autoCenter:   true,
    display:      "double",
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

function onTimerReady() {
  playerReady = true;
  document.querySelectorAll("button, input").forEach((el) => (el.disabled = false));
  prevPageBtn.disabled = true;
  nextPageBtn.disabled = true;
}

function onThrottledTimeUpdate(position) {
  positionEl.textContent = String(Math.floor(position));
  if (songDuration > 0) seekbar.value = (position / songDuration) * 100;

  // Reveal chars on time
  if (player.video) {
    let c = player.video.firstChar;
    while (c) {
      if (c.startTime <= position && !revealedChars.has(c)) {
        document
          .querySelectorAll(`span.char[data-start="${c.startTime}"]`)
          .forEach((s) => s.classList.add("visible"));
        revealedChars.add(c);
      } else if (c.startTime > position) {
        break;
      }
      c = c.next;
    }
  }

  if (!bookOpened) return;

  // End of song → jump to Fin page
  if (songDuration > 0 && position >= songDuration - 500) {
    bookOpened       = false;
    currentPageIndex = -1;
    $("#flipbook").turn("page", $("#flipbook").turn("pages"));
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
  revealedChars.clear();
  document.querySelectorAll("span.char").forEach((s) => s.classList.remove("visible"));
  if (flipbookReady) $("#flipbook").turn("page", $("#flipbook").turn("pages"));
}