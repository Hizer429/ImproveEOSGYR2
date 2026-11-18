# ImproveEOSGYR2

Desktop EOS dashboard and a browser/Tampermonkey comparison build using the same EOS calculation logic.

## Downloads

- [Tampermonkey userscript v0.1.2](https://raw.githubusercontent.com/Hizer429/ImproveEOSGYR2/main/browser-eos-test/GYR2-EOS-Browser-Test.user.js)
- [Browser test ZIP](https://github.com/Hizer429/ImproveEOSGYR2/raw/refs/heads/main/GYR2-EOS-Browser-Test.zip): standalone HTML preview, userscript, instructions, and synthetic CSV samples.
- [Browser setup and test instructions](browser-eos-test/README.md)

Import the userscript into Tampermonkey, enable Allow User Scripts in Chrome if requested, then visit `https://example.com/` and click **Open EOS**. Oculus is not required for CSV-based EOS. To test without Tampermonkey, extract the ZIP and open `EOS-Browser-Test.html` in Chrome or Edge.

## Latest EOS Rules

- Reject/rejection, misship variations, and missing-manifest notes (including No mani) count as disruptions. Manual Research Queue assignments use the same rules.
- Parcel trailers without an attached ISA can count in PS yard locations when Notes contains the word ISA and the carrier is UPSS, UPSN, FEDEX/FED EX, FDEG, or DHLC. Duplicate trailers are excluded; unknown units are not added to volume.
- CUT Helper is excluded from the browser test; the desktop version retains it.

## Development

Run the desktop app with `npm install` followed by `npm start`.

Rebuild the HTML preview and userscript with `node scripts/build-browser-eos.cjs`.

Run shared EOS regression tests with `node --test scripts/test-eos-note-rules.cjs`. The optional `node scripts/test-browser-eos.cjs` integration test uses an installed Windows Chrome, a temporary browser profile, and synthetic CSVs; it does not install Tampermonkey or call workplace APIs.
