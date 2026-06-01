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
  { start: 218000, end: 99999999,   label: "Verse 5"  },
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

// ---- Show page ----
function showPage(index) {
  if (index < 0 || index >= pages.length) return;
  currentPageIndex = index;

  if (flipbookReady) {
    const targetPage = index * 2 + 3;
    const currentPage = $("#flipbook").turn("page");
    if (currentPage !== targetPage) {
      $("#flipbook").turn("page", targetPage);
    }
  }

  if (pageLabel) pageLabel.textContent = `${index + 1} / ${pages.length}`;
  if (prevPageBtn) prevPageBtn.disabled = index === 0;
  if (nextPageBtn) nextPageBtn.disabled = index === pages.length - 1;
}

// ---- Open and play ----
function openAndPlay() {
  if (!playerReady || bookOpened) return;
  bookOpened = true;
  $("#flipbook").turn("next");
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
      if (!bookOpened) {
        openAndPlay();
      } else {
        player.requestPlay();
      }
    });

    pauseBtn.addEventListener("click", () =>
      player.video && player.requestPause()
    );

    rewindBtn.addEventListener("click", () => {
      if (!player.video) return;
      player.requestPause();
      player.requestMediaSeek(0);
      bookOpened = false;
      currentPageIndex = -1;
      if (flipbookReady) $("#flipbook").turn("page", 1);
    });

    seekbar.addEventListener("input", () => {
  if (player.video && songDuration > 0) {
    const seekTo = (seekbar.value / 100) * songDuration;
    // Un-reveal any chars whose start time is after the new position
    document.querySelectorAll("span.char.visible").forEach((s) => {
      if (parseFloat(s.dataset.start) > seekTo) {
        s.classList.remove("visible");
      }
    });
    // Also clean up revealedChars set so they can be re-revealed
    const toRemove = [];
    revealedChars.forEach((c) => {
      if (c.startTime > seekTo) toRemove.push(c);
    });
    toRemove.forEach((c) => revealedChars.delete(c));
    player.requestMediaSeek(seekTo);
  }
});

    prevPageBtn.addEventListener("click", () => {
      if (currentPageIndex > 0) {
        player.requestMediaSeek(pages[currentPageIndex - 1].start);
      }
    });

    nextPageBtn.addEventListener("click", () => {
      if (currentPageIndex < pages.length - 1) {
        player.requestMediaSeek(pages[currentPageIndex + 1].start);
      }
    });
  }

  if (!app.songUrl) {
    player.createFromSongUrl(SONG_URL);
  }
}

// function buildPages() {
//   pages = [];
//   const duration = player.video.duration;
//   const choruses = player.getChoruses ? player.getChoruses() : [];

//   if (choruses && choruses.length > 0) {
//     let cursor = 0;
//     for (const chorus of choruses) {
//       // verse/gap before this chorus
//       if (chorus.startTime > cursor + 1000) {
//         pages.push({ start: cursor, end: chorus.startTime });
//       }
//       // the chorus itself
//       pages.push({ start: chorus.startTime, end: chorus.endTime });
//       cursor = chorus.endTime;
//     }
//     // trailing section after the last chorus
//     if (duration > cursor + 1000) {
//       pages.push({ start: cursor, end: duration });
//     }
//   }

//   // Fallback: if sections are sparse, divide evenly into 6 pages
//   if (pages.length < 2) {
//     pages = [];
//     const n = 6;
//     for (let i = 0; i < n; i++) {
//       pages.push({
//         start: (duration / n) * i,
//         end: (duration / n) * (i + 1),
//       });
//     }
//   }

//   console.log("Built", pages.length, "pages:", pages);
// }

// function showPage(index) {
//   if (index < 0 || index >= pages.length) return;
//   currentPageIndex = index;

//   // re-trigger the page-in animation
//   const page = document.querySelector("#page");
//   page.style.animation = "none";
//   void page.offsetWidth; // force reflow
//   page.style.animation = "";

//   // label like "3 / 11"
//   pageLabel.textContent = `${index + 1} / ${pages.length}`;

//   // enable/disable arrows at the ends
//   prevPageBtn.disabled = index === 0;
//   nextPageBtn.disabled = index === pages.length - 1;
// }

function onVideoReady(v) {
  artistSpan.textContent = player.data.song.artist.name;
  songSpan.textContent   = player.data.song.name;
  songDuration           = player.video.duration;

  const flipbook     = document.getElementById("flipbook");
  const hardPages    = [...flipbook.querySelectorAll(".hard")];
  const insertBefore = hardPages[hardPages.length - 2];

  // Inject pages — lyric first (becomes right page), blank second (becomes left)
  pages.forEach((page, i) => {
    const div = document.createElement("div");
    div.className = "page";
    div.innerHTML = `
      <p class="page-section">${page.label}</p>
      <p class="lyric" id="lyric-${i}"></p>
    `;
    flipbook.insertBefore(div, insertBefore);

    const blank = document.createElement("div");
    blank.className = "page blank";
    flipbook.insertBefore(blank, insertBefore);
  });

  // Slot lyrics character-by-character, with per-character spans
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
        // line break before a new phrase on the same page
        const currentPhrase = char.parent?.parent;
        const previousPhrase = char.previous?.parent?.parent;
        if (lastPhrasePage === pageIdx && currentPhrase !== previousPhrase) {
          el.appendChild(document.createElement("br"));
      }
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = char.text;
        span.dataset.start = char.startTime;
        el.appendChild(span);
        lastPhrasePage = pageIdx;
      }
    }
    char = char.next;
  }

  // Init Turn.js
  $("#flipbook").turn({
    width: 800,
    height: 500,
    autoCenter: true,
    display: "double",
    acceleration: true,
    gradients: true,
    duration: 600,
    turnCorners: "",    // disable corner peel on hover
  });

  flipbookReady = true;
  document.getElementById("flipbook").classList.add("ready");
  document.getElementById("loading").classList.add("hidden");

  // Disable ALL mouse interaction — song controls page turning
  $("#flipbook").turn("disable", true);

  // Event delegation on cover click — still works despite disable
  $("#flipbook").on("click", ".hard", function () {
    if ($("#flipbook").turn("page") === 1) {
      openAndPlay();
    }
  });
}

function onTimerReady(t) {
  playerReady = true;
  document.querySelectorAll("button, input").forEach((el) => (el.disabled = false));
  // Start on the cover — no page navigation yet
  prevPageBtn.disabled = true;
  nextPageBtn.disabled = true;
}

function onThrottledTimeUpdate(position) {
  positionEl.textContent = String(Math.floor(position));
  if (songDuration > 0) {
    seekbar.value = (position / songDuration) * 100;
  }

  // Reveal characters whose start time has arrived
  if (player.video) {
    let c = player.video.firstChar;
    while (c) {
      if (c.startTime <= position && !revealedChars.has(c)) {
        const spans = document.querySelectorAll(`span.char[data-start="${c.startTime}"]`);
        spans.forEach((s) => s.classList.add("visible"));
        revealedChars.add(c);
      } else if (c.startTime > position) {
        break;
      }
      c = c.next;
    }
  }

  if (!bookOpened) return;

  // Jump to Fin when song ends
  if (songDuration > 0 && position >= songDuration - 500) {
    bookOpened = false;
    currentPageIndex = -1;
    const totalPages = $("#flipbook").turn("pages");
    $("#flipbook").turn("page", totalPages);
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

function onPlay() {}

function onPause() {}

function onStop() {
  currentPageIndex = -1;
  bookOpened = false;
  revealedChars.clear();
  document.querySelectorAll("span.char").forEach((s) => s.classList.remove("visible"));
  if (flipbookReady) {
    const lastPage = $("#flipbook").turn("pages");
    $("#flipbook").turn("page", lastPage);
  }
}