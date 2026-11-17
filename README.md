# Plan your 2027: page files

Files served to the "Plan your 2027 engagement in four steps" page on govocal.com.

| Path | What it is |
|---|---|
| `plan-2027.css`, `plan-2027.js` | The page's stylesheet and script. Loaded through jsDelivr at a pinned version tag. |
| `img/`, `media/` | Photos, the planner video and its poster. Served by GitHub Pages from the `main` branch. |
| `og/plan-2027-share.png` | The 1200 x 630 image shown when the page is shared. |
| `webflow/part-1.html` to `part-6.html` | The page markup. Each file is pasted into its own Code Embed in Webflow, in order. |

## Updating

- Stylesheet or script: commit, create a new version tag (for example `v1.0.1`), then change the version in the two addresses in Webflow (the stylesheet link at the top of part 1 and the script at the end of part 6).
- Photos or video: commit to `main`. Use a new file name when a file changes, so browsers do not keep the old one.
- Copy: edit the parts in Webflow, or rebuild them from the source and paste them again.

The planning guide link is set in one place: the `data-guide-url` attribute on the first element of part 1.
