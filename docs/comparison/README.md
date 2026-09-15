# Format comparison

The picture the [README](../../README.md) opens with, and the four documents in
it, are generated from one file.

`comparison.json` is the source. Everything else is derived:

| File | Written by | From |
| --- | --- | --- |
| `comparison.lino` | `generate.mjs` | `lino-objects-codec`, so it is the notation the codec writes today |
| `comparison.yaml` | `generate.mjs` | the `yaml` package |
| `comparison.xml` | `generate.mjs` | a small emitter in the same script |
| `comparison.svg`, `comparison-light.svg`, `comparison-dark.svg` | `generate_comparison_svgs.py` | the four documents above |
| `comparison.png`, `comparison-light.png`, `comparison-dark.png` | `generate_png.sh` | the three SVGs |

To change the example, edit `comparison.json` and regenerate:

```bash
cd docs/comparison
npm install
npm run generate     # documents and SVGs
./generate_png.sh    # PNGs, needs rsvg-convert, Inkscape or ImageMagick
```

`npm run check` regenerates nothing and fails if a committed file no longer
matches the source. The `docs` workflow runs it on every pull request that
touches this directory, which is what keeps the four documents saying the same
thing: they used to be maintained by hand, and the YAML had drifted to carry
three `id` fields none of the others had.

`generate.mjs` also decodes its own Links Notation and parses its own YAML back
before writing, so a document that loses a field fails the generator rather
than reaching the picture.
