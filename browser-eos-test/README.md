# EOS browser test

## Try on this computer first

Open `EOS-Browser-Test.html` in Chrome or Edge. No Node.js, Electron, Tampermonkey, or Oculus sign-in is needed for this preview. Use the same CSV files in the desktop app and browser preview to compare the results.

The preview bundles the current workspace's EOS interface, renderer, database logic, and barcode library. Version 0.1.1 removes the CUT Helper button, view, and script from the browser package. It retains the current app's EOS calculations and interface. Browser adapters replace desktop file dialogs, file writes, clipboard, display metrics, and storage. Font Awesome icons retain the existing CDN dependency; icons may be missing offline.

## Quick comparison with included synthetic files

All sample files are fictional test data.

1. Load `sample-yard.csv` into Yard/YMS and `sample-dock.csv` into Dock Dash.
2. Generate EOS. With no previous matching trailer memory: yard volume 4,000; door volume 2,000; one palletized drop; one transship in yard; one trailer in Research Queue; one Dock Dash trailer excluded because it is absent from Yard/YMS.
3. Open Research Hub. Load `sample-vendor.csv` and `sample-transship.csv`, then sync memory and generate EOS again.
4. Expect yard volume 4,500, door volume 2,000, two palletized drops, and zero remaining research items. The fourth yard trailer is now resolved using Vendor CSV data.
5. Check copied EOS text, Export CSV, and trailer details/manual corrections against the desktop app. Browser exports download as `Verified_EOS_Report.csv` instead of opening Electron's save dialog. If automatic copy is unavailable, a manual copy dialog appears.

Saved memory can affect subsequent comparisons. Use matching memory states or the app's testing controls when comparing with the desktop app.

## Tampermonkey version

1. Create a new Tampermonkey script and replace its editor contents with `GYR2-EOS-Browser-Test.user.js`, then save. Alternatively, use Tampermonkey's local file import.
2. Visit `https://example.com/` on this computer, refresh, and click **Open EOS**. This page is only a launcher; the script does not submit CSV data to Example.com.
3. At work, the same script also adds **Open EOS** on Oculus. The CSV workflow does not require Oculus APIs.

To update an existing installation, import the updated userscript and accept the update to version 0.1.2, then refresh the launch page. The script name, namespace, and memory storage key are unchanged so existing browser memory is retained.

## Disruption and parcel notes (0.1.2)

Reject/rejected/rejection, misship/mis-ship/misships, and missing-manifest notes (including No mani) now route trailers into their category's disruption count. Explicit negations such as "not rejected" and "no misships" do not trigger these new rules. Both Yard and Dock Dash notes are checked. Manual Research Queue assignments retain notes and use the same disruption rules.

Yard rows without an attached ISA count as parcels in yard when they have a PS location, an ISA word in Notes (case-insensitive), and a parcel carrier (UPSS, UPSN, FEDEX/FED EX, FDEG, DHLC) in Carrier or Owner (Operator). A non-trailer equipment type is excluded when Type is provided. Vehicle ID/VRID are used to avoid duplicates; a carrier/location fallback is used when those identifiers are absent. Rows already represented by an attached ISA are excluded from this fallback. These count-only rows do not create an ISA or add unknown units to volume; they appear as "No ISA (yard notes)" in parcel details. The verified Dock Dash CSV export remains based on attached-ISA matches.

For a focused test, load `sample-yard-notes.csv` and `sample-dock-notes.csv`, then generate EOS. Expect parcels in yard and total parcels to show **2 + 3 DISRUPTIONS**, yard volume **100**, and no Research Queue items. Duplicate trailer rows, the door row, tractor, other carrier, and row without ISA notes do not add to the fallback count. These files contain only synthetic data.

The existing Unified Freight/API diagnostic script is a separate script. This package does not replace it. A restrictive host-page security policy can affect userscript launch; the local HTML preview is the independent comparison path.

## Storage and limits

- Memory is separate from the desktop app. The local HTML preview uses its own browser storage; Tampermonkey uses script storage. They do not share memory with each other.
- Closing EOS hides it without discarding the loaded CSVs. Refreshing or closing the browser tab discards loaded CSVs; remembered trailer/research data follows the app's existing expiration rules.
- Experimental FC API requests are unavailable in this build. Use CSVs for Research Hub.
- Browser printing, clipboard permission prompts, icons, and download behavior may differ from Electron.
- This is a comparison build, not a claim that every workflow has been verified. Manual research edits, scanner hardware, printing, and actual Tampermonkey installation should be checked before relying on it for a shift.

## Development

Rebuild from the workspace with `node scripts/build-browser-eos.cjs`. The generated source manifest records hashes of the desktop files used. Rebuild after desktop changes to keep the comparison current. The ZIP is a distribution snapshot and must be repackaged separately after rebuilding.

`node scripts/test-browser-eos.cjs` runs headless Chrome against the local preview using a temporary profile and synthetic CSV files. It checks import/reconciliation, research enrichment, export, CUT removal, saved memory, cancellation, and a userscript launcher with mocked Tampermonkey APIs. It does not install Tampermonkey or call live workplace APIs.
