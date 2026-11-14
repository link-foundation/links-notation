Scriv 1.8.1 pins all twelve runtime dependencies with `==`. This prevents consumers from resolving even compatible patch updates. PyPI currently provides click 8.5.1 and markdown-it-py 4.3.0, while Scriv requires click 8.5.0 and markdown-it-py 4.2.0.

Minimal reproduction (uv 0.13.8, Python 3.15):

```sh
uv pip install --dry-run --python python3.15 'scriv==1.8.1' 'click==8.5.1'
```

Resolution fails because both exact click versions cannot be selected. The same conflict occurs with `markdown-it-py==4.3.0`.

In link-foundation/links-notation#406 we retain Scriv's required versions in native uv and hashed pip locks, rather than ignoring its metadata or forcing an untested override. The rest of the tooling resolves current releases and passes pip-audit.

Could Scriv use compatible requirements in its published library metadata (for example `click>=8.5.0,<9` and `markdown-it-py>=4.2.0,<5`) and keep exact development resolution in its own lockfile? That would preserve reproducibility for Scriv's development environment while allowing downstream applications to adopt compatible fixes. Tests against the lower bounds and current releases would validate those ranges.
