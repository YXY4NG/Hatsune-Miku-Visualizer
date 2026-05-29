import { Player } from "textalive-app-api";

const textEl = document.querySelector("#text");

// Soft fade-in/out on each new phrase
let lastPhrase = "";
const animatePhrase = function (now, unit) {
  if (unit.contains(now)) {
    if (unit.text !== lastPhrase) {
      lastPhrase = unit.text;
      textEl.classList.remove("visible");
      textEl.classList.add("fading");
      setTimeout(() => {
        textEl.textContent = unit.text;
        textEl.classList.remove("fading");
        textEl.classList.add("visible");
      }, 200);
    }
  }
};


// TextAlive Player
const player = new Player({
  app: { token: "1HJzpsZ11CfoUPrr" },
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

const playBtns = document.querySelectorAll(".play");
const jumpBtn = document.querySelector("#jump");
const pauseBtn = document.querySelector("#pause");
const rewindBtn = document.querySelector("#rewind");
const positionEl = document.querySelector("#position strong");
const artistSpan = document.querySelector("#artist span");
const songSpan = document.querySelector("#song span");
const seekbar = document.querySelector("#seekbar");
const book = document.querySelector("#book");
const pageLabel = document.querySelector("#page-label");
const prevPageBtn = document.querySelector("#prev-page");
const nextPageBtn = document.querySelector("#next-page");
let songDuration = 0;
let pages = [];          // each: { start, end }
let currentPageIndex = -1;

function onAppReady(app) {
  if (!app.managed) {
    document.querySelector("#control").style.display = "flex";

    playBtns.forEach((btn) =>
      btn.addEventListener("click", () => player.video && player.requestPlay())
    );
    jumpBtn.addEventListener("click", () =>
      player.video && player.requestMediaSeek(player.video.firstChar.startTime)
    );
    pauseBtn.addEventListener("click", () =>
      player.video && player.requestPause()
    );
    rewindBtn.addEventListener("click", () =>
      player.video && player.requestMediaSeek(0)
    );
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
    player.createFromSongUrl("https://piapro.jp/t/zoqO/20251214200738");
  }
}

function buildPages() {
  const duration = player.video.duration;

  // Page boundaries in milliseconds, with a label per page
  // Each entry is the START time of the page
  const manualPages = [
    { start: 0,                    label: "intro" },
    { start: 28 * 1000,            label: "verse 1" },
    { start: 41 * 1000,            label: "verse 2" },
    { start: (1 * 60 + 10) * 1000, label: "chorus 1" },
    { start: (1 * 60 + 51) * 1000, label: "verse 3" },
    { start: (2 * 60 + 21) * 1000, label: "chorus 2" },
    { start: (2 * 60 + 48) * 1000, label: "verse 4" },
    { start: (3 * 60 + 11) * 1000, label: "chorus 3" },
    { start: (3 * 60 + 38) * 1000, label: "verse 5" },
    { start: (4 * 60 + 6) * 1000,  label: "ending" },
  ];
  // Build pages: each page's end = next page's start (or song end for the last)
  pages = manualPages.map((p, i) => ({
    start: p.start,
    end: i < manualPages.length - 1 ? manualPages[i + 1].start : duration,
    label: p.label,
  }));

  console.log("Built", pages.length, "manual pages:", pages);
}

function showPage(index) {
  if (index < 0 || index >= pages.length) return;
  currentPageIndex = index;

  // re-trigger the page-in animation
  const page = document.querySelector("#page");
  page.style.animation = "none";
  void page.offsetWidth; // force reflow
  page.style.animation = "";

  // label like "3 / 11"
  pageLabel.textContent = `${index + 1} / ${pages.length} · ${pages[index].label}`;

  // enable/disable arrows at the ends
  prevPageBtn.disabled = index === 0;
  nextPageBtn.disabled = index === pages.length - 1;
}

function onVideoReady(v) {
  artistSpan.textContent = player.data.song.artist.name;
  songSpan.textContent = player.data.song.name;
  songDuration = player.video.duration;
  let p = player.video.firstPhrase;
  while (p) {
    p.animate = animatePhrase;
    p = p.next;
  }
  buildPages();
}

function onTimerReady(t) {
  if (!player.app.managed) {
    document.querySelectorAll("button, input").forEach((el) => (el.disabled = false));
  }
  jumpBtn.disabled = !player.video.firstChar;
}

function onThrottledTimeUpdate(position) {
  positionEl.textContent = String(Math.floor(position));
  if (songDuration > 0) {
    seekbar.value = (position / songDuration) * 100;
  }
   // figure out which page we're on based on time
  for (let i = 0; i < pages.length; i++) {
    if (position >= pages[i].start && position < pages[i].end) {
      if (i !== currentPageIndex) showPage(i);
      break;
    }
  }
}

function onPlay() {
  document.querySelector("#overlay").style.display = "none";
}

function onPause() {
  // Keep the current lyric visible while paused
}

function onStop() {
  textEl.classList.remove("visible");
  textEl.textContent = "";
  lastPhrase = "";
  sunsetTriggered = false;
  skySunset.classList.remove("active");
}