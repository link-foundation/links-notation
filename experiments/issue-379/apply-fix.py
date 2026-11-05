"""One-shot: apply the lessParentheses fix to all ten bindings. Each replacement must match exactly."""
import re
def sub(path, pairs):
    s = open(path, encoding='utf-8').read()
    for old, new, *count in pairs:
        n = s.count(old)
        want = count[0] if count else 1
        assert n == want, (path, old, n)
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)

# JavaScript
sub('js/src/Link.js', [
("""      return lessParentheses ? '' : '()';
""", """      return '()';
"""),
("""      return options.lessParentheses ? '' : '()';
""", """      return '()';
"""),
("""      // For lessParentheses mode with simple values, don't wrap the whole thing
      if (lessParentheses) {
""", """      // For lessParentheses mode with simple values, don't wrap the whole thing
      if (lessParentheses && !this._hasLoneNestedValue()) {
"""),
("""        testLine = options.lessParentheses ? valuesStr : `(${valuesStr})`;
""", """        testLine =
          options.lessParentheses && !this._hasLoneNestedValue()
            ? valuesStr
            : `(${valuesStr})`;
"""),
("""    if (this.id === null) {
      if (options.lessParentheses) {
""", """    if (this.id === null) {
      if (options.lessParentheses && !this._hasLoneNestedValue()) {
"""),
("""  /**
   * Format the link using a FormatOptions object
""", """  /**
   * Whether this link holds exactly one link that has values. The parentheses
   * of an anonymous link are what nest such a value: `((b c))` without them is
   * `(b c)`, a different link, so lessParentheses has to keep them.
   * @returns {boolean} True if the only value has values of its own
   */
  _hasLoneNestedValue() {
    return this.values.length === 1 && this.values[0].values?.length > 0;
  }

  /**
   * Format the link using a FormatOptions object
"""),
])

# Python
sub('python/links_notation/link.py', [
("""            return "" if less_parentheses else "()"
""", """            return "()"
"""),
("""            return "" if config.less_parentheses else "()"
""", """            return "()"
"""),
("""        if self.id is None:
            if less_parentheses:
""", """        if self.id is None:
            if less_parentheses and not self._has_lone_nested_value():
"""),
("""                test_line = values_str if config.less_parentheses else f"({values_str})"
""", """                keeps_parentheses = not config.less_parentheses or self._has_lone_nested_value()
                test_line = f"({values_str})" if keeps_parentheses else values_str
"""),
("""        if self.id is None:
            if config.less_parentheses:
""", """        if self.id is None:
            if config.less_parentheses and not self._has_lone_nested_value():
"""),
("""    def _format_with_config(self, config""", """    def _has_lone_nested_value(self) -> bool:
        \"\"\"
        Check whether this link holds exactly one link that has values.

        The parentheses of an anonymous link are what nest such a value:
        ``((b c))`` without them is ``(b c)``, a different link, so
        less_parentheses has to keep them.
        \"\"\"
        return len(self.values) == 1 and bool(self.values[0].values)

    def _format_with_config(self, config"""),
])

# Go
sub('go/lino.go', [
("""		if lessParentheses {
			return ""
		}
		return "()"
""", """		return "()"
""", 2),
("""		if config.LessParentheses {
			return ""
		}
		return "()"
""", """		return "()"
""", 2),
("""	if l.ID == nil {
		if lessParentheses {
""", """	if l.ID == nil {
		if lessParentheses && !l.hasLoneNestedValue() {
"""),
("""		} else if config.LessParentheses {
			testLine = valuesStr
""", """		} else if config.LessParentheses && !l.hasLoneNestedValue() {
			testLine = valuesStr
"""),
("""	if l.ID == nil {
		if config.LessParentheses {
""", """	if l.ID == nil {
		if config.LessParentheses && !l.hasLoneNestedValue() {
"""),
("""// needsParentheses checks if a string needs to be wrapped in parentheses.
""", """// hasLoneNestedValue reports whether the link holds exactly one link that has
// values. The parentheses of an anonymous link are what nest such a value:
// "((b c))" without them is "(b c)", a different link, so LessParentheses has to
// keep them.
func (l *Link) hasLoneNestedValue() bool {
	return len(l.Values) == 1 && len(l.Values[0].Values) > 0
}

// needsParentheses checks if a string needs to be wrapped in parentheses.
"""),
])

# Java
sub('java/src/main/java/io/github/linkfoundation/linksnotation/Link.java', [
("""      return lessParentheses ? "" : "()";
""", """      return "()";
"""),
("""    if (id == null) {
      if (lessParentheses) {
""", """    if (id == null) {
      if (lessParentheses && !hasLoneNestedValue()) {
"""),
("""  private boolean needsParentheses(String str) {""", """  private boolean hasLoneNestedValue() {
    return values.size() == 1 && !values.get(0).values.isEmpty();
  }

  /**
   * Check if a string needs to be wrapped in parentheses.
   *
   * @param str the string to check
   * @return true if the string needs parentheses
   */
  private boolean needsParentheses(String str) {"""),
])

# PHP
sub('php/src/Link.php', [
("""            return $lessParentheses ? '' : '()';
""", """            return '()';
"""),
("""            return $config->lessParentheses ? '' : '()';
""", """            return '()';
"""),
("""            if ($lessParentheses) {
                // Check if all values""", """            if ($lessParentheses && !$this->hasLoneNestedValue()) {
                // Check if all values"""),
("""                $testLine = $config->lessParentheses ? $valuesString : '(' . $valuesString . ')';
""", """                $testLine = $config->lessParentheses && !$this->hasLoneNestedValue()
                    ? $valuesString
                    : '(' . $valuesString . ')';
"""),
("""            if ($config->lessParentheses) {
                if ($this->allValuesAreSimple()) {""", """            if ($config->lessParentheses && !$this->hasLoneNestedValue()) {
                if ($this->allValuesAreSimple()) {"""),
("""    /**
     * Check whether every value is a plain reference without nested values.
""", """    /**
     * Check whether this link holds exactly one link that has values.
     *
     * The parentheses of an anonymous link are what nest such a value: `((b c))`
     * without them is `(b c)`, a different link, so lessParentheses has to keep
     * them.
     */
    private function hasLoneNestedValue(): bool
    {
        return count($this->values) === 1 && $this->values[0]->values;
    }

    /**
     * Check whether every value is a plain reference without nested values.
"""),
])

# C#
sub('csharp/Link.Foundation.Links.Notation/LinkFormatExtensions.cs', [
("""                return options.LessParentheses ? "" : "()";
""", """                return "()";
"""),
("""                    testLine = options.LessParentheses ? valuesStr : $"({valuesStr})";
""", """                    testLine = options.LessParentheses && !link.HasLoneNestedValue() ? valuesStr : $"({valuesStr})";
"""),
("""            if (link.Id == null)
            {
                if (options.LessParentheses)
                {
""", """            if (link.Id == null)
            {
                if (options.LessParentheses && !link.HasLoneNestedValue())
                {
"""),
("""        /// <summary>
        /// Format a link with indentation.
""", """        /// <summary>
        /// Whether the link holds exactly one link that has values. The parentheses of an
        /// anonymous link are what nest such a value: ((b c)) without them is (b c), a
        /// different link, so less parentheses has to keep them.
        /// </summary>
        internal static bool HasLoneNestedValue<TLinkAddress>(this Link<TLinkAddress> link)
        {
            return link.Values != null && link.Values.Count == 1 && link.Values[0].Values != null && link.Values[0].Values!.Count > 0;
        }

        /// <summary>
        /// Format a link with indentation.
"""),
])
sub('csharp/Link.Foundation.Links.Notation/IListExtensions.cs', [
("""                return string.Join(Environment.NewLine, links.Select(l => l.ToString().TrimSingle('(').TrimSingle(')')));
""", """                return string.Join(Environment.NewLine, links.Select(FormatWithLessParentheses));
"""),
("""        /// <summary>
        /// Formats a collection of links using FormatOptions configuration.
""", """        /// <summary>
        /// Writes a link without its outer parentheses, unless they are what the link is:
        /// an empty anonymous link, or an anonymous link that nests one link with values.
        /// </summary>
        private static string FormatWithLessParentheses<TLinkAddress>(Link<TLinkAddress> link)
        {
            var text = link.ToString();
            var isEmpty = link.Id == null && (link.Values == null || link.Values.Count == 0);
            return isEmpty || (link.Id == null && link.HasLoneNestedValue()) ? text : text.TrimSingle('(').TrimSingle(')');
        }

        /// <summary>
        /// Formats a collection of links using FormatOptions configuration.
"""),
])

# C++
sub('cpp/src/link.cpp', [
("""  if (!id && values.empty()) return less_parentheses ? "" : "()";
""", """  if (!id && values.empty()) return "()";
"""),
("""    if (less_parentheses) return all_simple(values) ? escaped_ids(values) : formatted_values;
""", """    if (less_parentheses && !has_lone_nested_value(values)) {
      return all_simple(values) ? escaped_ids(values) : formatted_values;
    }
"""),
("""      test_line = config.less_parentheses ? formatted_values : "(" + formatted_values + ")";
""", """      test_line = config.less_parentheses && !has_lone_nested_value(values) ? formatted_values
                                                                            : "(" + formatted_values + ")";
"""),
("""bool all_simple(const std::vector<Link>& values) {
""", """// The parentheses of an anonymous link are what nest a lone value that has
// values: "((b c))" without them is "(b c)", a different link.
bool has_lone_nested_value(const std::vector<Link>& values) {
  return values.size() == 1 && !values.front().values.empty();
}

bool all_simple(const std::vector<Link>& values) {
"""),
])

# Swift
sub('swift/Sources/LinksNotation/Link.swift', [
("""                return lessParentheses ? "" : "()"
""", """                return "()"
"""),
("""            if lessParentheses {
                if values.allSatisfy""", """            if lessParentheses && !hasLoneNestedValue {
                if values.allSatisfy"""),
("""            return options.lessParentheses ? "" : "()"
""", """            return "()"
"""),
("""                testLine = options.lessParentheses ? inline : "(\\(inline))"
""", """                testLine = options.lessParentheses && !hasLoneNestedValue ? inline : "(\\(inline))"
"""),
("""            if options.lessParentheses {
                if values.allSatisfy""", """            if options.lessParentheses && !hasLoneNestedValue {
                if values.allSatisfy"""),
("""    private var formattedValues: String {
""", """    /// Whether this link holds exactly one link that has values. The
    /// parentheses of an anonymous link are what nest such a value: `((b c))`
    /// without them is `(b c)`, a different link, so `lessParentheses` has to
    /// keep them.
    private var hasLoneNestedValue: Bool {
        values.count == 1 && !values[0].values.isEmpty
    }

    private var formattedValues: String {
"""),
])

# Kotlin
sub('kotlin/src/commonMain/kotlin/io/github/linkfoundation/linksnotation/Formatter.kt', [
("""        return if (lessParentheses) "" else "()"
""", """        return "()"
"""),
("""        return if (options.lessParentheses) "" else "()"
""", """        return "()"
"""),
("""    if (id == null) {
        if (lessParentheses) {
""", """    if (id == null) {
        if (lessParentheses && !hasLoneNestedValue(values)) {
"""),
("""                    if (options.lessParentheses) valuesText else "($valuesText)"
""", """                    if (options.lessParentheses && !hasLoneNestedValue(values)) valuesText else "($valuesText)"
"""),
("""    if (id == null) {
        if (options.lessParentheses) {
""", """    if (id == null) {
        if (options.lessParentheses && !hasLoneNestedValue(values)) {
"""),
("""/** Port of `Link.needsParentheses(str)`. */
""", """/**
 * Port of `Link._hasLoneNestedValue()`: the parentheses of an anonymous link
 * are what nest a lone value that has values. `((b c))` without them is
 * `(b c)`, a different link, so `lessParentheses` has to keep them.
 */
private fun hasLoneNestedValue(values: List<Link>): Boolean = values.size == 1 && values[0].values.isNotEmpty()

/** Port of `Link.needsParentheses(str)`. */
"""),
])

# Rust
sub('rust/links-notation/src/lib.rs', [
("""                if id.is_none() && values.is_empty() {
                    return if config.less_parentheses {
                        String::new()
                    } else {
                        "()".to_string()
                    };
                }
""", """                if id.is_none() && values.is_empty() {
                    return "()".to_string();
                }
"""),
("""                    return if config.less_parentheses {
                        String::new()
                    } else {
                        "()".to_string()
                    };
                }

                // Check if we should use indented format
""", """                    return "()".to_string();
                }

                // Check if we should use indented format
"""),
("""                    } else if config.less_parentheses {
                        values_str.clone()
""", """                    } else if config.less_parentheses && !has_lone_nested_value(values) {
                        values_str.clone()
"""),
("""                if id.is_none() {
                    if config.less_parentheses {
                        // Check if all values""", """                if id.is_none() {
                    if config.less_parentheses && !has_lone_nested_value(values) {
                        // Check if all values"""),
("""/// Check if a string needs to be wrapped in parentheses.
fn needs_parentheses""", """/// Whether a link holds exactly one link that has values. The parentheses of an
/// anonymous link are what nest such a value: `((b c))` without them is `(b c)`,
/// a different link, so `less_parentheses` has to keep them.
fn has_lone_nested_value<T>(values: &[LiNo<T>]) -> bool {
    matches!(values, [LiNo::Link { values: nested, .. }] if !nested.is_empty())
}

/// Check if a string needs to be wrapped in parentheses.
fn needs_parentheses"""),
])
