# SongBridge · GitHub / Netlify edition

This is a complete buildless website. Includes 24 visible song entries, the updated covers, language filters, related recordings, and 24 downloadable lyric sheets. No MP3 recordings are included.

## Upload to GitHub

1. Unzip this package on your computer.
2. Open the folder. Upload its CONTENTS into the root of your SongBridge GitHub repository, where index.html lives. Do not upload the ZIP itself or nest everything in another folder.
3. Replace matching website files. Keep any existing MP3s and your own domain files. Back up your current repository first if you have made separate edits since the version shared here.
4. Commit the changes. Your connected Netlify site should redeploy.

Netlify settings for this package: no build command, publish directory `.` (repository root), no base directory. netlify.toml supplies the publish directory. No npm, database, or install step is required.

## Add songs tomorrow

For each recording:

1. Finish its MP3 metadata and embedded cover art.
2. Give the file a simple filename, using lowercase letters and hyphens. Keep Spanish, English, and bilingual recordings in separate files.
3. Upload the MP3 into the `audio` folder in GitHub.
4. Edit `recordings.js` in GitHub. Find the matching song and language. Put its exact path inside the empty quotation marks. Example:

```js
0: "audio/i-am-me-english.mp3",
```

5. Commit. Once Netlify finishes deploying, refresh the site. A player will appear on that song card and in its detail view.
6. Play it on your phone and verify that the cover, lyrics, and recording match.

Names are case-sensitive. Leave unready recordings as empty quotes. Keep each line's comma. You can use another filename; the path in recordings.js simply has to match it exactly. You can also use a direct HTTPS MP3 URL from your own audio hosting.

The “Try your recording” control is only a temporary device preview. It does NOT upload or permanently save music. Use audio/ and recordings.js for recordings visitors should hear.

Only one audio player plays at a time. Files are not downloaded until a listener starts playback (card players use preload=none).

## Recording checklist

| ID | Song | Language | Suggested MP3 filename |
| --- | --- | --- | --- |
| 0 | I Am Me | English | i-am-me-english.mp3 |
| 1 | Not Yet, Still Here | English | not-yet-still-here-english.mp3 |
| 20 | Aún No, Sigo Aquí | Español | a-n-no-sigo-aqu-spanish.mp3 |
| 2 | Mariposa | English + Español | mariposa-bilingual.mp3 |
| 21 | Mariposa | Español | mariposa-spanish.mp3 |
| 22 | Mariposa | English | mariposa-english.mp3 |
| 3 | Every Voice Belongs | English | every-voice-belongs-english.mp3 |
| 4 | Many Ways Forward | English | many-ways-forward-english.mp3 |
| 23 | Muchas Formas de Avanzar | Español | muchas-formas-de-avanzar-spanish.mp3 |
| 5 | We Come Back | English | we-come-back-english.mp3 |
| 6 | Breathe Me Back to Center | English | breathe-me-back-to-center-english.mp3 |
| 7 | Brighter Than Before | English | brighter-than-before-english.mp3 |
| 8 | Pass It On | English | pass-it-on-english.mp3 |
| 9 | Echo of My Name | English + Español | echo-of-my-name-bilingual.mp3 |
| 10 | The Language Dance | English | the-language-dance-english.mp3 |
| 11 | Language Power | English | language-power-english.mp3 |
| 12 | Learning’s Journey | English | learning-s-journey-english.mp3 |
| 13 | Joy Stays | English | joy-stays-english.mp3 |
| 14 | Before You Ask Them to Learn | English | before-you-ask-them-to-learn-english.mp3 |
| 15 | Learning What Holds | English | learning-what-holds-english.mp3 |
| 16 | The Space to Learn | English | the-space-to-learn-english.mp3 |
| 17 | Find Our Voice | English | find-our-voice-english.mp3 |
| 18 | Belonging Is the Compass | English | belonging-is-the-compass-english.mp3 |
| 19 | Finding Our Way | English | finding-our-way-english.mp3 |

## Covers and lyrics

`covers/` contains website cover art. `lyrics/` contains the printable PDFs. `lyrics-pdfs.js` powers the download buttons. Keep these files together with `songs.js`, `app.js`, `style.css`, `recordings.js`, `index.html`, and `art/`.

This package does not change the ChatGPT-hosted copy. GitHub/Netlify becomes the home for the recordings you add here. Browser favorites stay on each device and domain.

## NEW: Display lyrics for sing-alongs

Every song card and lyric panel has **Display lyrics**. The projection view shows cover art alongside large scrollable lyrics. Use **Full screen**, adjust **Text size**, and use **Previous / Next** (or arrow keys while focused on the lyric area). On narrow screens the cover becomes a small header above the lyrics.

With **Follow audio** checked, the display advances at each timestamp, including after seeking backward or forward. Previous / Next turns follow off so you can lead manually; check it again to resume. Playback stops when the display closes. Only one recording plays at a time.

### Add timing with your existing tool or AI tool

1. Open **Display lyrics → Recording & timing → Download timing template** for the correct language/version. This contains that song's lyric phrases with `time: null`.
2. Use the SongBridge Lyric Timing Studio (its exported `songbridge-lyric-cues-v1` JSON works directly), or have your AI tool add a start time in seconds to each phrase using the exact recording. Keep repeated choruses as separate cues. Timing must be in ascending song order; untimed phrases may retain `null`.
3. Choose **Try audio** and **Import cue map** to rehearse. Files selected this way are temporary for this browser visit. Adjust and keep your JSON export outside the browser.
4. For everyone to use the finished display, add the MP3 in `audio/` and its path in `recordings.js`. Add the exported JSON in `timings/` and its path under the same song ID in `timings.js`. Commit both files and mappings to GitHub; Netlify deploys them together.

Example in `timings.js`:
```js
window.SONGBRIDGE_TIMINGS = {
  0: "timings/i-am-me-english.json",
  20: "timings/aun-no-sigo-aqui.json"
};
```

Cue-map structure (illustrative times only, not supplied timings for a real song):
```json
{
  "format": "songbridge-lyric-cues-v1",
  "title": "Song title",
  "cues": [
    {"section": "Verse 1", "text": "First sung phrase", "time": 4.2},
    {"section": "Verse 1", "text": "Next sung phrase", "time": 8.6}
  ]
}
```

The display uses the cue file's text, so proofread it as well as its timing. A gap between cue times keeps the previous phrase visible during instrumental passages. There are no invented timings included: all songs work manually now and become synchronized once you add their recording and cue file. Each English, Spanish, and bilingual recording has its own song ID and independent timings. Full-screen availability depends on the browser; the display still fills its window when unsupported.
