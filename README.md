# Elektronica website

Website of Elektronica, the Electronics and Signals club of IIT Hyderabad.
Built with [Hugo](https://gohugo.io), Tailwind CSS and [GSAP](https://gsap.com).
Type is IBM Plex Sans and IBM Plex Mono (loaded from Google Fonts in `layouts/partials/head.html`).
The palette is neutral greys plus one accent colour, defined in `tailwind.config.js`.

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

All motion is in `assets/js/` and is bundled by Hugo into one file.

| File          | What it does                                                                 |
| ------------- | ---------------------------------------------------------------------------- |
| `hero.js`     | Oscilloscope under the hero text (mouse sets frequency and amplitude), decoding title |
| `pcb.js`      | PCB rail on the left that lights up as you scroll, with a pad at each heading |
| `showcase.js` | Home page blog cards pinned and scrolled sideways                             |
| `ui.js`       | Mobile menu, scroll line, reveal-on-scroll, copy-email button                 |

GSAP is vendored in `assets/js/vendor/gsap/` (see the README there), so there is no
npm dependency on it. Everything respects `prefers-reduced-motion`: the hero shows a
still frame, the rail is fully lit and nothing is pinned or animated.
