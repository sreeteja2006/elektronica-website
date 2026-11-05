# Elektronica website

Website of Elektronica, the Electronics and Signals club of IIT Hyderabad.
Built with [Hugo](https://gohugo.io), Tailwind CSS and [GSAP](https://gsap.com).
Type is Instrument Serif (headings) and Instrument Sans (text), loaded from Google Fonts in
`layouts/partials/head.html`. The palette is warm near-black plus one accent (solder orange),
defined in `tailwind.config.js`. There is no monospace font on the site.

## Run it locally

You need **Hugo extended 0.156 or newer** and **Node 18+**.

```sh
npm install
npm start        # Tailwind in watch mode + hugo server on http://localhost:1313
```

Production build (what Netlify runs, see `netlify.toml`):

```sh
npm run build    # compiles Tailwind into assets/css/style.css, then hugo --gc --minify
```

`assets/css/style.css` is generated from `assets/css/main.css` and is committed, so
run `npm run build:css` after changing styles or Tailwind classes.

## Where things live

| To change...                              | Edit                                                    |
| ----------------------------------------- | ------------------------------------------------------- |
| Tagline, description, mission text, links | `config.yaml` (`params:`)                               |
| Team                                      | `data/team.yaml`                                        |
| Projects                                  | `data/projects.yaml`                                    |
| Events                                    | `data/events.yaml`                                      |
| Menu                                      | `config.yaml` (`menu:`)                                 |
| Colours and fonts                         | `tailwind.config.js`, `assets/css/main.css`             |
| Page layouts                              | `layouts/`                                              |

### Placeholders

The Team, Projects and Events pages currently hold placeholder entries, each marked
with a dashed "placeholder" tag on the page. Replace the values in the matching
`data/*.yaml` file and delete the `placeholder: true` line to remove the tag. Each
file has instructions at the top.

### Blog

The blog section pulls the latest posts from the Medium feed in `config.yaml`
(`params.blog.medium_feed`) **when the site is built**. New Medium posts show up on
the next build; `.github/workflows/rebuild.yml` triggers one every day (it needs the
`NETLIFY_BUILD_HOOK` secret described in that file).

If the feed can't be fetched (Medium down, or blocking the build server), the site
falls back to the posts in `content/posts/` so the build never fails. Each of those
files only needs a title, summary, date, `link` (the Medium URL) and an image.

### Before going live

Set `params.site_url` in `config.yaml` (for example `https://elektronica.iith.dev`).
Until it is set, the canonical link and social-preview image tags are left out.

## Animations

All motion is in `assets/js/` and is bundled by Hugo into one file. GSAP does the
timing; the drawing is plain canvas.

| File        | What it does                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `wire.js`   | A wire you can pluck: a damped vibrating string on a canvas. Used by the hero and under page titles.   |
| `hero.js`   | Fits the title to the page width. Its letters grow out of the wire and pluck it as they land.          |
| `signal.js` | Mission scene: a square wave is summed from sine harmonics as you scroll (pinned on desktop).          |
| `tuner.js`  | Blog as a radio tuner: scroll turns the dial, posts lock in out of static, scrolling snaps to stations. |
| `ui.js`     | Mobile menu, scroll line, reveal-on-scroll, copy-email button, wires under page titles.                |

GSAP is vendored in `assets/js/vendor/gsap/` (see the README there), so there is no
npm dependency on it. Everything respects `prefers-reduced-motion`: the wire is flat,
the square wave is complete and the blog is a plain list. On phones nothing is pinned
and the blog is a plain list.
