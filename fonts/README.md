# Fonts

This directory holds font assets that are embedded into rendered check PDFs.

## GnuMICR.ttf — required for production

The check renderer (`apps/api/src/features/print/pdf-renderer.ts`) embeds an
E-13B MICR font into the bottom-line of every check it draws. Without this
font the check is **not machine readable** by bank scanners.

GnuMICR is a free TrueType font that implements the four E-13B symbols
(TRANSIT ⑆, ON-US ⑈, AMOUNT ⑇, DASH ⑉) plus the digits 0-9. It is
distributed under the GNU GPL.

### Install

Drop `GnuMICR.ttf` into this directory:

```
fonts/GnuMICR.ttf
```

The renderer locates the font via this default path, or falls back to the
absolute path in the `MICR_FONT_PATH` environment variable. In production
deployments, ship the font as a build artifact alongside the API binary
(Docker `COPY fonts/ /app/fonts/`).

### Development fallback

If the font is missing the renderer falls back to embedded Courier so the
PDFs remain visually intact for layout testing. Such PDFs are stamped
`MICR-FALLBACK` and must not be printed for negotiable use.

### License

GnuMICR is distributed under the GNU GPL v2. The bundled binary in this
directory is *not* committed to source control — install it yourself per
the steps above.

## Signature script fonts — required for text-mode signatures

Templates may contain `signature` objects that render a typed `signerName`
in a script font instead of an uploaded image. The PDF renderer embeds
three SIL Open Font Licensed (OFL 1.1) families, all from Google Fonts:

| Family       | File                       | Designer enum   |
| ------------ | -------------------------- | --------------- |
| Caveat       | `Caveat-Regular.ttf`       | `caveat`        |
| Sacramento   | `Sacramento-Regular.ttf`   | `sacramento`    |
| Great Vibes  | `GreatVibes-Regular.ttf`   | `great-vibes`   |

If a font file is missing, that family falls back to Helvetica Oblique so
PDF rendering never crashes — but the visual output will not match what
the designer canvas previews.

### Install

From the repo root:

```bash
curl -L -o fonts/Caveat-Regular.ttf      https://github.com/google/fonts/raw/main/ofl/caveat/static/Caveat-Regular.ttf
curl -L -o fonts/Sacramento-Regular.ttf  https://github.com/google/fonts/raw/main/ofl/sacramento/Sacramento-Regular.ttf
curl -L -o fonts/GreatVibes-Regular.ttf  https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf

```

The renderer looks in this directory by default; override with the
`SIGNATURE_FONT_DIR` environment variable. In Docker, copy them into the
runtime image alongside `GnuMICR.ttf` (`COPY fonts/ /app/fonts/`).

### License

All three families are distributed under the SIL Open Font License 1.1
(http://scripts.sil.org/OFL). OFL is *not* copyleft — the fonts can be
embedded in PDFs and bundled into Docker images without royalty or
license-propagation requirements. The repo-level `.dockerignore`
currently excludes `*.ttf` because of the GPL-licensed `GnuMICR.ttf`; if
you want signature rendering in production you can either (a) carve out
an exception for the OFL fonts, or (b) mount them at runtime via the
`SIGNATURE_FONT_DIR` env var. The font binaries are *not* committed to
source control — install them with the commands above.
