# After the Curtain — A Lyric Sketchbook

An interactive lyric application created for the **Hatsune Miku "Magical Mirai 2026" Programming Contest**.

As the song plays, an open sketchbook turns its pages in time with the music. Each section of the song becomes a page of the book — the lyrics appear character by character on the right, hand-drawn sketches sit on the left, and the whole experience opens from a closed cover and plays through to the end.

**Song:** "After the Curtain" (アフター・ザ・カーテン) by Rulmry
**Powered by:** the [TextAlive App API](https://developer.textalive.jp/)

---

## Concept

The song's title evokes the quiet moment after a performance ends. We built the experience around that feeling: a personal sketchbook, the kind someone keeps and fills in slowly. The music opens the book, and as each verse and chorus passes, a page turns — lyrics written out by hand, paired with sketches. By the final page, the book closes again.

The visual style is a black-and-white pencil sketchbook: ruled notebook paper, a margin line, a handwritten Japanese font (Klee One), and a warm coffee-brown cover.

---

## How it works

The application uses the TextAlive App API to retrieve the song's lyrics and their precise timing. The song is divided into sections (intro, verses, choruses), and each section is assigned to a page of the book.

- **Lyric timing** — TextAlive provides the start time of every character. As playback reaches each character's time, that character fades in, creating a handwritten reveal effect synced to the vocals.
- **Page turning** — The book is rendered with turn.js. As the song's playback position crosses each section boundary, the book automatically turns to the matching page. Navigation arrows allow manual page turning as well.
- **Lyric placement** — Characters are grouped by phrase so that complete lines stay together on a single page.
- **Playback controls** — Play, pause, rewind, and a seek bar are provided. Seeking forward reveals all prior lyrics; seeking backward hides upcoming ones, keeping the page state consistent with the music.

---

## Credits

This project was created by two people:

- **YXY4NG** — TextAlive integration, lyric synchronization, lyric animation
- **Raptorking10** — turn.js page-turning, artwork and sketches

### Music

- "After the Curtain" (アフター・ザ・カーテン) by **Rulmry**

### Character

Hatsune Miku and related characters are © Crypton Future Media, INC. Original artwork in this project is fan art created by the authors under the [piapro Character License (PCL)](https://piapro.net/intl/en_for_creators.html) for non-commercial use.

### Libraries

- [TextAlive App API](https://developer.textalive.jp/) — lyric and timing data
- [turn.js](http://www.turnjs.com/) — page-turning effect
- [jQuery](https://jquery.com/) — required by turn.js
- [Parcel](https://parceljs.org/) — bundler / dev server
- Font: [Klee One](https://fonts.google.com/specimen/Klee+One) (Google Fonts)

---

## Running locally

This is a static web application. To run it on your own machine:

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm)

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/YXY4NG/Hatsune-Miku-Magical-Mirai-2026-Coding-Competition.git
   cd Hatsune-Miku-Magical-Mirai-2026-Coding-Competition
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the address shown in the terminal (usually `http://localhost:1234`).

### Building for production

To generate the static output files (into the `docs/` folder):

```bash
npm run build
```

---

## Project structure

```
src/
  index.html   — page markup (the book, controls, metadata)
  index.css    — sketchbook styling, theme, layout
  index.js     — TextAlive integration, lyric reveal, page-turning logic
```
