import $ from "jquery";
window.$ = $;
window.jQuery = $;
import "turn.js";
import { Player } from "textalive-app-api";

// ---- Config ----
const SONG_URL = "https://piapro.jp/t/zoqO/20251214200738";
const APP_TOKEN = "YOUR_APP_TOKEN";

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
  { start: 218000, end: 246000,   label: "Verse 5"  },
  { start: 246000, end: 99999999, label: "Ending"   },
];

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

  // Slot lyrics before Turn.js init
  let phrase = player.video.firstPhrase;
  while (phrase) {
    const pageIdx = pages.findIndex(
      (pg) => phrase.startTime >= pg.start && phrase.startTime < pg.end
    );
    if (pageIdx !== -1) {
      const el = document.getElementById(`lyric-${pageIdx}`);
      if (el) el.textContent += (el.textContent ? "\n" : "") + phrase.text;
    }
    phrase = phrase.next;
  }

  // Init Turn.js
  $("#flipbook").turn({
    width: 1000,
    height: 600,
    autoCenter: true,
    display: "double",
    acceleration: true,
    gradients: true,
    duration: 600,
    turnCorners: "",    // disable corner peel on hover
  });

  flipbookReady = true;

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
}

function onThrottledTimeUpdate(position) {
  positionEl.textContent = String(Math.floor(position));
  if (songDuration > 0) {
    seekbar.value = (position / songDuration) * 100;
  }

  if (!bookOpened) return;

  // Jump to Fin when song ends
  if (songDuration > 0 && position >= songDuration - 500) {
    bookOpened = false;
    currentPageIndex = -1;
    const totalPages = $("#flipbook").turn("pages");
    $("#flipbook").turn("page", totalPages);
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
  if (flipbookReady) {
    const lastPage = $("#flipbook").turn("pages");
    $("#flipbook").turn("page", lastPage);
  }
}