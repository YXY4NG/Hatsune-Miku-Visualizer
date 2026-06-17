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

// ---- Inline SVG sketches for the blank left pages ----
const SKETCH_SVG = `
<svg class="sketch" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
  <g><path style="fill:none;stroke:#222222;stroke-width:1.5" d="m 181.09901,199.39475 c -7.8987,-2.44452 -15.81612,-4.99906 -17.59427,-5.67677 -3.11524,-1.18731 -10.3247,-4.58403 -9.04692,-4.26243 0.34342,0.0864 4.55814,1.40651 9.36604,2.9335 4.80791,1.527 13.77598,4.30872 19.92906,6.18159 6.15308,1.87288 11.39807,3.48143 11.65552,3.57456 0.3309,0.11969 0.48002,-1.35797 0.50874,-5.04122 0.0265,-3.39258 0.42373,-7.67827 1.13863,-12.28343 1.44355,-9.29879 1.93297,-14.5326 1.98422,-21.21868 0.0341,-4.45493 0.11966,-5.20222 0.44966,-3.92939 0.73169,2.82222 0.10764,16.54126 -1.09925,24.16572 -1.2489,7.88985 -1.86566,18.19279 -1.11527,18.63056 0.92612,0.54029 0.50686,1.40985 -0.67015,1.38993 -0.62961,-0.0107 -7.60731,-2.01943 -15.50601,-4.46394 z m 16.26917,1.97292 c 0.0954,-0.084 1.92802,-1.15371 4.07251,-2.37707 5.22357,-2.97987 10.35124,-5.37397 19.82824,-9.25775 4.35001,-1.78268 9.14733,-3.82802 10.6607,-4.5452 l 2.7516,-1.30398 0.48085,-4.83623 c 0.40199,-4.04302 1.1582,-26.18451 1.34616,-39.41482 0.043,-3.02801 0.10276,-3.31048 0.41558,-1.96469 0.57366,2.46803 0.56632,34.27068 -0.009,39.29385 -0.27232,2.37728 -0.60712,4.74925 -0.74401,5.27104 -0.18731,0.71401 -0.10474,0.89346 0.33376,0.72534 2.14375,-0.8219 2.12704,-0.82138 1.97406,-0.0614 -0.23072,1.14615 -5.03827,3.51143 -16.66446,8.19878 -5.79459,2.33621 -13.60843,5.63754 -17.3641,7.33628 -6.22021,2.81349 -7.5855,3.37948 -7.08182,2.93585 z m -45.7222,-23.47435 c 0.1534,-7.8271 0.40536,-11.23556 1.17263,-15.8632 1.17845,-7.10759 1.44579,-19.62434 0.4435,-20.76499 -0.31422,-0.35759 -0.48701,-0.65017 -0.38398,-0.65017 0.10302,0 1.95234,0.72694 4.10959,1.61541 7.77417,3.20182 17.47384,6.60722 30.04312,10.54765 7.04014,2.20707 12.80026,4.17053 12.80026,4.36325 0,0.74969 -6.23855,-0.83759 -17.90552,-4.55572 -9.56277,-3.04754 -16.20108,-5.50949 -22.72813,-8.42917 l -5.04268,-2.2557 0.34973,1.42007 c 0.70468,2.86133 0.38058,11.86715 -0.71573,19.88818 -0.81743,5.98064 -1.08967,9.82299 -1.13915,16.07775 -0.0518,6.54573 -0.18044,8.2553 -0.63202,8.39738 -0.47195,0.14848 -0.53425,-1.49294 -0.37162,-9.79074 z m 48.60139,-22.90486 c 0,-0.53296 7.04577,-5.36576 11.16968,-7.66146 4.94468,-2.75259 24.08055,-12.21317 24.70353,-12.21317 0.18819,0 0.34216,0.1746 0.34216,0.388 0,0.64002 -2.96729,2.23849 -14.98567,8.07275 -11.35841,5.51388 -15.44793,7.69083 -19.25243,10.24852 -1.0875,0.73111 -1.97727,1.25552 -1.97727,1.16536 z m -48.70343,-15.5042 c 0,-0.56392 0.69935,-0.9541 8.53351,-4.76098 14.14323,-6.87268 18.91558,-9.3156 25.49645,-13.05135 2.26708,-1.28695 1.51176,-0.45768 -1.32127,1.45062 -3.37556,2.27375 -11.23759,6.4961 -22.77301,12.23037 -8.77503,4.36208 -9.93568,4.84469 -9.93568,4.13134 z m 80.13171,-5.84178 c -1.37369,-0.53368 -7.18063,-2.17711 -12.90433,-3.65205 -14.61955,-3.76732 -29.62008,-8.1201 -28.28575,-8.2078 0.5085,-0.0334 7.81428,1.73048 25.67831,6.19978 12.21255,3.05539 17.92766,4.79906 18.47634,5.63709 0.59809,0.91349 -0.64759,0.92315 -2.96457,0.023 z"/></g>
</svg>`;

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
  const book = $("#flipbook");

  book.css({ transition: "opacity 0.25s ease", opacity: 0 });   // fade out
  setTimeout(() => {
    book.turn("display", "double");
    book.turn("size", 800, 500);   // resize now, while invisible
    book.css("opacity", 1);        // fade back in...
    book.turn("page", 3);          // ...as the cover flips open
    player.requestPlay();
  }, 250);
}

// ---- Collapse to the lone back cover (mirror of openAndPlay) ----
function showBackCover() {
  if (!flipbookReady) return;
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
      if (!flipbookReady) return;

      const book = $("#flipbook");
      book.css({ transition: "opacity 0.25s ease", opacity: 0 });   // fade out
      setTimeout(() => {
        book.turn("display", "single");
        book.turn("size", 400, 500);
        book.turn("page", 1);
        book.css("opacity", 1);                                      // fade back in
      }, 250);
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

  // Put the first sketch on the very first left page (facing the Intro lyrics).
  // That slot is turn.js's hidden inside-cover page, so we turn it into a normal blank.
  const introBlank = hardPages[1];
  introBlank.classList.remove("hard");
  introBlank.classList.add("page", "blank");
  introBlank.innerHTML = SKETCH_SVG;

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
  revealedChars.clear();
  document.querySelectorAll("span.char").forEach((s) => s.classList.remove("visible"));
  if (flipbookReady) showBackCover();
}