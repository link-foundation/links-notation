# Translation rule evaluation

`TranslationRuleSet` turns a links network into target text by assigning an
ordered rule to each matching link. The first rule whose `LinkQuery` matches a
link owns that link. Rendering a captured child recursively applies the rule
set to that child, while rendering a whole network emits every matched link
that is not owned by another matched link.

Use `TranslationRuleSet::render_link` in Rust or the optional third argument to
`TranslationRuleSet.render` in JavaScript when the caller already knows the
root link. The network reconstruction helpers render all roots.

## Template syntax

Rules name fixed-position references with `with_reference_capture` in Rust or
`withReferenceCapture` in JavaScript.

| Syntax | Meaning |
| --- | --- |
| `{name}` | Recursively render one captured link in the current target language. |
| `{name:text}` | Reconstruct the captured link's source-token text without applying a rule. |
| `{name:term}` | Insert the captured link's metadata term. |
| `{name:concept}` | Insert the captured link's concept identifier. |
| `{name:context}` | Render in the target sub-language named `context`, such as `JavaScript:command`. |
| `{*name\|separator}` | Render every reference of the captured link and join the results. |
| `{?name}...{/name}` | Include a segment only when the named capture resolves. |
| `{{` / `}}` | Insert a literal opening or closing brace. |

`.` names the currently matched link, so `{*.\|\n}` renders all of its
references separated by newlines. Variadic separators recognize `\n`, `\t`,
and `\s` escapes. An unresolved placeholder renders as empty text.

When a multi-line value is substituted after leading whitespace, continuation
lines inherit the placeholder's indentation.

## Rendering contexts and fallbacks

A placeholder mode other than `text`, `source`, `term`, `concept`, or
`language` selects a target sub-language. For example, `{body:command}` in a
`JavaScript` template looks for a `JavaScript:command` template on the child
rule.

Fallbacks are part of the serializable rule set:

```js
const rules = new TranslationRuleSet('shell-to-js')
  .withLanguageFallback('JavaScript:value', 'JavaScript:command');
```

```rust
let rules = TranslationRuleSet::new("shell-to-js")
    .with_language_fallback("JavaScript:value", "JavaScript:command");
```

Fallback declarations survive both JavaScript JSON and cross-language LiNo
round trips. Cyclic fallback declarations are safe; each target is visited at
most once.

## Parser front-ends

Translation rules evaluate an existing links network; they do not parse a new
source language. `LanguageProfile::builtin` currently does not provide a Shell
profile, and the generic lossless parser cannot infer Shell syntax nodes.
Consumers translating Shell or another unsupported grammar should supply a
front-end that inserts `Syntax` nodes and source-token leaves, then pass its
root link and rule set to the evaluator. Rust front-ends can use
`insert_dynamic_syntax_node` when a parser determines a node's child count at
run time.
