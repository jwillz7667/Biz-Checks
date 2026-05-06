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
