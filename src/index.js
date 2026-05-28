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
  pages = [];
  const duration = player.video.duration;
  const choruses = player.getChoruses ? player.getChoruses() : [];

  if (choruses && choruses.length > 0) {
    let cursor = 0;
    for (const chorus of choruses) {
      // verse/gap before this chorus
      if (chorus.startTime > cursor + 1000) {
        pages.push({ start: cursor, end: chorus.startTime });
      }
      // the chorus itself
      pages.push({ start: chorus.startTime, end: chorus.endTime });
      cursor = chorus.endTime;
    }
    // trailing section after the last chorus
    if (duration > cursor + 1000) {
      pages.push({ start: cursor, end: duration });
    }
  }

  // Fallback: if sections are sparse, divide evenly into 6 pages
  if (pages.length < 2) {
    pages = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      pages.push({
        start: (duration / n) * i,
        end: (duration / n) * (i + 1),
      });
    }
  }

  console.log("Built", pages.length, "pages:", pages);
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
  pageLabel.textContent = `${index + 1} / ${pages.length}`;

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