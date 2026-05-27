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

// Floating dust particle animation
const canvas = document.querySelector("#bg-canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const particles = Array.from({ length: 55 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 2.5 + 0.5,
  opacity: Math.random() * 0.35 + 0.05,
  speed: Math.random() * 0.3 + 0.1,
  drift: (Math.random() - 0.5) * 0.3,
  wobble: Math.random() * Math.PI * 2,
  wobbleSpeed: Math.random() * 0.008 + 0.003,
}));

const drawParticles = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    p.wobble += p.wobbleSpeed;
    p.x += p.drift + Math.sin(p.wobble) * 0.3;
    p.y -= p.speed;
    if (p.y < -10) {
      p.y = canvas.height + 10;
      p.x = Math.random() * canvas.width;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
    ctx.fill();
  }
  requestAnimationFrame(drawParticles);
};
drawParticles();

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
const skySunset = document.querySelector("#sky-sunset");
let sunsetTriggered = false;
let songDuration = 0;

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
  }

  if (!app.songUrl) {
    player.createFromSongUrl("https://piapro.jp/t/zoqO/20251214200738");
  }
}

  if (!app.songUrl) {
    player.createFromSongUrl("https://piapro.jp/t/zoqO/20251214200738");
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
    const pastMidpoint = position > songDuration / 2;
    skySunset.classList.toggle("active", pastMidpoint);
    seekbar.value = (position / songDuration) * 100;
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