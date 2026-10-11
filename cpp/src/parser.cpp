// The grammar, ported from rust/links-notation/src/parser.rs.
//
// The Rust parser is built from nom combinators, and what it accepts and where
// it reports a failure follow from how those combinators backtrack. This port
// keeps that behaviour exactly by giving every rule the same three outcomes:
// success with the position after what it read, a recoverable error that lets
// an alternative be tried, and a failure that stops the whole parse. An error
// carries the position it happened at, which bounds the reported position the
// way nom's own error position does in Rust.
//
// The parsed tree is then turned into links the way js/src/Parser.js does.

#include "links_notation/parser.hpp"

#include <algorithm>
#include <map>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>

#include "links_notation/comments.hpp"
#include "links_notation/references.hpp"
#include "quotes.hpp"

namespace links_notation {

namespace {

/// A line as the grammar reads it, before indentation is expanded.
struct RawLink {
  std::optional<std::string> id;
  std::vector<RawLink> values;
  std::vector<RawLink> children;
  /// Whether this link stands for a parenthesized group, whose body is kept
  /// unflattened in `nested` until the whole document is transformed.
  bool is_nested = false;
  std::vector<RawLink> nested;

  static RawLink singlet(std::string id) {
    RawLink link;
    link.id = std::move(id);
    return link;
  }

  static RawLink value(std::vector<RawLink> values) {
    RawLink link;
    link.values = std::move(values);
    return link;
  }

  static RawLink group(std::vector<RawLink> body) {
    RawLink link;
    link.is_nested = true;
    link.nested = std::move(body);
    return link;
  }
};

enum class Status { ok, error, failure };

/// The outcome of a rule: on success `at` is where the rest of the document
/// starts, otherwise it is where the rule gave up.
struct Step {
  Status status;
  std::size_t at;

  bool ok() const { return status == Status::ok; }
};

constexpr Step ok_at(std::size_t at) { return {Status::ok, at}; }
constexpr Step error_at(std::size_t at) { return {Status::error, at}; }
constexpr Step failure_at(std::size_t at) { return {Status::failure, at}; }

bool is_whitespace_byte(char character) {
  return character == ' ' || character == '\t' || character == '\n' || character == '\r';
}

bool is_horizontal_whitespace(char character) { return character == ' ' || character == '\t'; }

bool is_reference_byte(char character) {
  return !is_whitespace_byte(character) && character != '(' && character != ':' && character != ')';
}

/// Where a parse stopped, and what could have continued the document there.
struct Failure {
  std::size_t offset;
  std::vector<std::string> expected;
  std::optional<std::size_t> max_depth_exceeded;
};

class Grammar {
 public:
  Grammar(std::string_view document, std::size_t max_depth)
      : document_(document), references_(document), max_depth_(max_depth) {}

  /// Reads the whole document, or says where it stopped.
  std::vector<RawLink> read() {
    std::vector<RawLink> result;
    const Step step = document(result);
    if (!step.ok()) throw failure(step);
    return result;
  }

 private:
  // Characters, by position. Past the end reads as a NUL that matches nothing.
  char at(std::size_t position) const { return position < document_.size() ? document_[position] : '\0'; }
  bool at_end(std::size_t position) const { return position >= document_.size(); }

  std::size_t horizontal_whitespace(std::size_t position) const {
    while (!at_end(position) && is_horizontal_whitespace(document_[position])) ++position;
    return position;
  }

  std::size_t whitespace(std::size_t position) const {
    while (!at_end(position) && is_whitespace_byte(document_[position])) ++position;
    return position;
  }

  std::size_t count_spaces(std::size_t position) const {
    std::size_t end = position;
    while (!at_end(end) && document_[end] == ' ') ++end;
    return end - position;
  }

  /// The position after a line ending at `position`, if there is one.
  std::optional<std::size_t> strip_line_ending(std::size_t position) const {
    if (at(position) == '\r' && at(position + 1) == '\n') return position + 2;
    if (at(position) == '\n' || at(position) == '\r') return position + 1;
    return std::nullopt;
  }

  /// Skips the line breaks and blank lines before the next line.
  std::size_t skip_empty_lines(std::size_t position) const {
    for (;;) {
      const auto next = strip_line_ending(horizontal_whitespace(position));
      if (!next) return position;
      position = *next;
    }
  }

  // ---- Indentation and nesting state ----

  std::size_t base_indentation() const { return base_indentation_.value_or(0); }

  std::size_t normalize_indentation(std::size_t indent) const {
    const std::size_t base = base_indentation();
    return indent > base ? indent - base : 0;
  }

  std::size_t current_indentation() const { return indentation_stack_.back(); }

  void pop_indentation() {
    if (indentation_stack_.size() > 1) indentation_stack_.pop_back();
  }

  bool inside_nested_context() const { return nested_depth_ > 0; }

  /// Nesting depth of the line being parsed: every enclosing parenthesized
  /// group and every indentation level counts as one.
  std::size_t depth() const { return context_depth_ + indentation_stack_.size() - 1; }

  /// Fails for good when `depth` is deeper than the parser allows, so that no
  /// alternative goes on to recurse any further.
  Step check_depth(std::size_t position, std::size_t depth) {
    if (depth <= max_depth_) return ok_at(position);
    if (!too_deep_) too_deep_ = position;
    return failure_at(position);
  }

  /// Records that `what` could have continued the document at `position`.
  /// Only the furthest such position is kept, with every expectation recorded
  /// at it.
  void expected_at(std::size_t position, const char* what) {
    if (furthest_ && *furthest_ > position) return;
    if (furthest_ && *furthest_ == position) {
      for (const std::string& known : expected_) {
        if (known == what) return;
      }
      expected_.emplace_back(what);
      return;
    }
    furthest_ = position;
    expected_.assign(1, what);
  }

  Step expected(std::size_t position, const char* what) {
    expected_at(position, what);
    return error_at(position);
  }

  /// Turns everything recorded during a failed parse into one position.
  Failure failure(Step step) const {
    if (too_deep_) return Failure{std::min(*too_deep_, document_.size()), {}, max_depth_};
    const std::size_t tracked = furthest_.value_or(0);
    const std::size_t offset = std::min(std::max(tracked, step.at), document_.size());
    // Expectations recorded at an earlier position do not describe this one.
    return Failure{offset, tracked == offset ? expected_ : std::vector<std::string>(), std::nullopt};
  }

  // ---- Rules ----

  Step reference(std::size_t input, std::string& out) {
    const std::string_view rest = document_.substr(std::min(input, document_.size()));
    if (has_reference_literal_prefix(rest)) {
      const std::size_t closing = rest.find('}');
      if (closing != std::string_view::npos) {
        try {
          out = decode_reference_literal(rest.substr(0, closing + 1));
          return ok_at(input + closing + 1);
        } catch (const std::invalid_argument&) {
        }
      }
      expected_at(input, "a valid version 1 reference literal");
      return failure_at(input);
    }
    if (auto reading = references_.read(input)) {
      out = std::move(reading->value);
      return ok_at(input + reading->length);
    }
    std::size_t end = input;
    while (!at_end(end) && is_reference_byte(document_[end])) ++end;
    if (end > input) {
      out.assign(document_.substr(input, end - input));
      return ok_at(end);
    }
    expected_at(input, "a reference");
    return error_at(input);
  }

  Step eol(std::size_t input) {
    const std::size_t after_space = horizontal_whitespace(input);
    if (const auto next = strip_line_ending(after_space)) return ok_at(*next);
    if (at_end(after_space)) return ok_at(after_space);
    const Step end = nested_group_end(input);
    if (!end.ok()) expected_at(input, "end of line");
    return end;
  }

  /// Inside a parenthesized group the closing parenthesis ends the last line,
  /// just like a line break does at the root.
  Step nested_group_end(std::size_t input) {
    if (!inside_nested_context()) return error_at(input);
    const std::size_t rest = horizontal_whitespace(input);
    if (at(rest) == ')') return ok_at(rest);
    return expected(rest, "\")\"");
  }

  Step reference_or_link(std::size_t input, RawLink& out) {
    const Step group = nested_group(input, out);
    if (group.status != Status::error) return group;
    std::string id;
    const Step step = reference(input, id);
    if (step.ok()) out = RawLink::singlet(std::move(id));
    return step;
  }

  Step single_line_value_and_whitespace(std::size_t input, RawLink& out) {
    return reference_or_link(horizontal_whitespace(input), out);
  }

  /// Reads further values until one does not parse, the way nom's many0 does.
  Step more_values(std::size_t input, std::vector<RawLink>& values) {
    for (;;) {
      RawLink value;
      const Step step = single_line_value_and_whitespace(input, value);
      if (step.status == Status::failure) return step;
      if (step.status == Status::error) return ok_at(input);
      if (step.at == input) return error_at(input);
      values.push_back(std::move(value));
      input = step.at;
    }
  }

  Step single_line_values(std::size_t input, std::vector<RawLink>& values) {
    RawLink first;
    const Step step = single_line_value_and_whitespace(input, first);
    if (!step.ok()) return step;
    values.push_back(std::move(first));
    return more_values(step.at, values);
  }

  Step colon(std::size_t input) { return character(':', input, "\":\""); }

  Step character(char wanted, std::size_t input, const char* what) {
    if (at(input) == wanted) return ok_at(input + 1);
    return expected(input, what);
  }

  Step single_line_link(std::size_t input, RawLink& out) {
    std::string id;
    Step step = reference(horizontal_whitespace(input), id);
    if (!step.ok()) return step;
    step = colon(horizontal_whitespace(step.at));
    if (!step.ok()) return step;
    std::vector<RawLink> values;
    step = single_line_values(step.at, values);
    if (!step.ok()) return step;
    out = RawLink();
    out.id = std::move(id);
    out.values = std::move(values);
    return step;
  }

  Step single_line_value_link(std::size_t input, RawLink& out) {
    std::vector<RawLink> values;
    const Step step = single_line_values(input, values);
    if (step.ok()) out = RawLink::value(std::move(values));
    return step;
  }

  Step indented_id_link(std::size_t input, RawLink& out) {
    std::string id;
    Step step = reference(input, id);
    if (!step.ok()) return step;
    step = colon(horizontal_whitespace(step.at));
    if (!step.ok()) return step;
    step = eol(step.at);
    if (step.ok()) out = RawLink::singlet(std::move(id));
    return step;
  }

  /// A parenthesized group opens a nested context: its body starts fresh at
  /// indentation level zero and is parsed with the same rules as the root.
  Step nested_group(std::size_t input, RawLink& out) {
    const Step open = character('(', input, "\"(\"");
    if (!open.ok()) return open;
    const Step deep = check_depth(input, depth() + 1);
    if (!deep.ok()) return deep;

    std::vector<std::size_t> saved_stack = std::move(indentation_stack_);
    const std::optional<std::size_t> saved_base = base_indentation_;
    const std::size_t saved_context_depth = context_depth_;
    indentation_stack_.assign(1, 0);
    base_indentation_.reset();
    context_depth_ = saved_context_depth + saved_stack.size();  // depth() + 1
    ++nested_depth_;

    const Step result = nested_group_body(open.at, out);

    indentation_stack_ = std::move(saved_stack);
    base_indentation_ = saved_base;
    context_depth_ = saved_context_depth;
    if (nested_depth_ > 0) --nested_depth_;
    return result;
  }

  Step nested_group_body(std::size_t input, RawLink& out) {
    std::vector<RawLink> body;
    const Step read = links(skip_empty_lines(input), body);
    if (read.ok()) {
      const Step close = closing_parenthesis(whitespace(read.at));
      if (close.ok()) out = RawLink::group(std::move(body));
      return close;
    }
    if (read.status == Status::failure) return read;
    const Step close = closing_parenthesis(whitespace(input));
    if (close.ok()) out = RawLink::group({});
    return close;
  }

  Step closing_parenthesis(std::size_t input) { return character(')', input, "\")\""); }

  Step single_line_any_link(std::size_t input, RawLink& out) {
    RawLink link;
    Step step = single_line_link(input, link);
    if (step.ok()) step = eol(step.at);
    if (step.ok()) {
      out = std::move(link);
      return step;
    }
    if (step.status == Status::failure) return step;

    link = RawLink();
    step = single_line_value_link(input, link);
    if (step.ok()) step = eol(step.at);
    if (step.ok()) out = std::move(link);
    return step;
  }

  /// Reads one line, or fails at once when the line was already found
  /// unreadable. Without this, the work doubles with every indented level
  /// (issue #314).
  Step any_link(std::size_t input, RawLink& out) {
    const std::pair<std::size_t, bool> key{input, inside_nested_context()};
    const auto known = unreadable_lines_.find(key);
    if (known != unreadable_lines_.end()) return error_at(known->second);
    const Step step = read_any_link(input, out);
    if (step.status == Status::error) unreadable_lines_.emplace(key, step.at);
    return step;
  }

  /// A line that starts with a parenthesized group reads that group once and
  /// then branches on what follows it.
  Step read_any_link(std::size_t input, RawLink& out) {
    RawLink group;
    const Step read = nested_group(input, group);
    if (!read.ok()) {
      // Nothing else can read a line that opens a group. Report it the way
      // the single-line value link does, as a missing reference.
      if (at(input) == '(') {
        std::string id;
        const Step step = reference(input, id);
        if (step.ok()) out = RawLink::singlet(std::move(id));
        return step;
      }
      RawLink link;
      Step step = indented_id_link(input, link);
      if (step.status == Status::error) {
        link = RawLink();
        step = single_line_any_link(input, link);
      }
      if (step.ok()) out = std::move(link);
      return step;
    }

    const Step end = eol(read.at);
    if (end.ok()) {
      out = std::move(group);
      return end;
    }
    std::vector<RawLink> values;
    values.push_back(std::move(group));
    Step step = more_values(read.at, values);
    if (!step.ok()) return step;
    step = eol(step.at);
    if (step.ok()) out = RawLink::value(std::move(values));
    return step;
  }

  Step push_indentation(std::size_t input) {
    const std::size_t start = skip_empty_lines(input);
    const std::size_t spaces = count_spaces(start);
    if (normalize_indentation(spaces) > current_indentation()) {
      indentation_stack_.push_back(normalize_indentation(spaces));
      return ok_at(start + spaces);
    }
    return error_at(start + spaces);
  }

  Step check_indentation(std::size_t input) const {
    const std::size_t spaces = count_spaces(input);
    if (normalize_indentation(spaces) >= current_indentation()) return ok_at(input + spaces);
    return error_at(input + spaces);
  }

  Step element(std::size_t input, RawLink& out) {
    RawLink link;
    const Step read = any_link(input, link);
    if (!read.ok()) return read;
    // Only a line that parsed counts, so trailing spaces indented past the
    // limit are still read as the whitespace they are.
    const Step deep = check_depth(input, depth());
    if (!deep.ok()) return deep;

    std::vector<std::size_t> indentation = indentation_stack_;
    const Step pushed = push_indentation(read.at);
    if (pushed.ok()) {
      std::vector<RawLink> children;
      const Step step = links(pushed.at, children);
      if (step.ok()) {
        link.children = std::move(children);
        out = std::move(link);
        return step;
      }
      if (step.status == Status::failure) return step;
      // No child line followed the indentation. Backtrack to the link so the
      // document can consume the remaining spaces as whitespace.
      indentation_stack_ = std::move(indentation);
    }
    out = std::move(link);
    return read;
  }

  Step first_line(std::size_t input, RawLink& out) {
    // Set base indentation from the first line and consume it, so that the
    // first line is parsed exactly like every following line.
    const std::size_t spaces = count_spaces(input);
    if (!base_indentation_) base_indentation_ = spaces;
    return element(input + spaces, out);
  }

  Step line(std::size_t input, RawLink& out) {
    // Blank lines do not break a document, they are simply skipped.
    const Step indented = check_indentation(skip_empty_lines(input));
    if (!indented.ok()) return indented;
    return element(indented.at, out);
  }

  Step links(std::size_t input, std::vector<RawLink>& out) {
    RawLink first;
    const Step step = first_line(input, first);
    if (!step.ok()) return step;
    out.push_back(std::move(first));

    std::size_t position = step.at;
    for (;;) {
      RawLink next;
      const Step read = line(position, next);
      if (read.status == Status::failure) return read;
      if (read.status == Status::error) break;
      if (read.at == position) return error_at(position);
      out.push_back(std::move(next));
      position = read.at;
    }
    pop_indentation();
    return ok_at(position);
  }

  Step document(std::vector<RawLink>& out) {
    // Skip leading blank lines but preserve the line structure.
    const std::size_t start = skip_empty_lines(0);
    if (whitespace(start) == document_.size()) return ok_at(document_.size());

    const Step read = links(start, out);
    if (!read.ok()) return read;
    const std::size_t rest = whitespace(read.at);
    if (!at_end(rest)) return expected(rest, "end of input");
    return ok_at(rest);
  }

  std::string_view document_;
  detail::DelimitedReferences references_;
  std::size_t max_depth_;

  std::vector<std::size_t> indentation_stack_{0};
  std::optional<std::size_t> base_indentation_;
  std::size_t nested_depth_ = 0;
  std::size_t context_depth_ = 0;
  std::optional<std::size_t> too_deep_;
  std::optional<std::size_t> furthest_;
  std::vector<std::string> expected_;
  std::map<std::pair<std::size_t, bool>, std::size_t> unreadable_lines_;
};

// ---- From the parsed tree to links, as js/src/Parser.js does it ----

Link transform_link(const RawLink& item);

Link combine_path_elements(const std::vector<Link>& path, std::size_t count, Link current) {
  if (count == 0) return current;
  Link parent = count == 1 ? path[0] : combine_path_elements(path, count - 1, path[count - 1]);
  Link combined(std::nullopt, {std::move(parent), std::move(current)});
  combined.from_path_combination = true;
  return combined;
}

void push_combined(const std::vector<Link>& path, Link current, std::vector<Link>& result) {
  result.push_back(combine_path_elements(path, path.size(), std::move(current)));
}

// A line below an indented ID is a value in its own right. Bare single
// references unwrap, but named links and descendants keep their structure.
Link transform_indented_value(const RawLink& item) {
  if (!item.children.empty() && item.id && item.values.empty()) {
    std::vector<Link> values;
    for (const RawLink& child : item.children) values.push_back(transform_indented_value(child));
    return Link(item.id, std::move(values));
  }

  Link current = transform_link(item);
  if (!item.children.empty()) {
    std::vector<Link> values = current.values;
    for (const RawLink& child : item.children) values.push_back(transform_indented_value(child));
    return Link(current.id, std::move(values));
  }
  if (!item.id && !item.is_nested && current.values.size() == 1) return current.values[0];
  return current;
}

void collect_links(const RawLink& item, const std::vector<Link>& path, std::vector<Link>& result) {
  if (item.children.empty()) {
    push_combined(path, transform_link(item), result);
    return;
  }
  // An ID with no values whose lines below it are its values.
  if (item.id && item.values.empty()) {
    std::vector<Link> values;
    for (const RawLink& child : item.children) values.push_back(transform_indented_value(child));
    push_combined(path, Link(item.id, std::move(values)), result);
    return;
  }
  Link current = transform_link(item);
  push_combined(path, current, result);
  std::vector<Link> child_path = path;
  child_path.push_back(std::move(current));
  for (const RawLink& child : item.children) collect_links(child, child_path, result);
}

// A single link in parentheses is that link, several become the values of one
// anonymous link, and a group that only wraps another group keeps it, so that
// `((a b))` stays distinct from `(a b)`.
Link transform_nested(const std::vector<RawLink>& nested) {
  std::vector<Link> links;
  for (const RawLink& item : nested) collect_links(item, {}, links);
  const bool wraps_single_group = nested.size() == 1 && nested[0].is_nested;
  if (links.size() == 1 && !wraps_single_group) return std::move(links[0]);
  return Link(std::nullopt, std::move(links));
}

Link transform_link(const RawLink& item) {
  if (item.is_nested) return transform_nested(item.nested);
  std::vector<Link> values;
  values.reserve(item.values.size());
  for (const RawLink& value : item.values) values.push_back(transform_link(value));
  return Link(item.id, std::move(values));
}

LinksGroup transform_group(const RawLink& item) {
  std::vector<LinksGroup> children;
  for (const RawLink& child : item.children) children.push_back(transform_group(child));
  return LinksGroup(transform_link(item), std::move(children));
}

bool is_blank(std::string_view document) {
  for (const char character : document) {
    if (!is_whitespace_byte(character)) return false;
  }
  return true;
}

/// Reads `document` into its tree, throwing ParseError when it does not parse.
std::vector<RawLink> read_document(std::string_view document, const ParserOptions& options) {
  if (document.size() > options.max_input_size) {
    throw std::length_error("Input size exceeds maximum allowed size of " + std::to_string(options.max_input_size) +
                            " bytes");
  }
  if (is_blank(document)) return {};

  // Comments are blanked rather than removed, so a position reported for the
  // prepared document is the same position in the document the caller wrote.
  const std::string prepared = options.comments ? strip_comments(document) : std::string(document);
  Grammar grammar(prepared, options.max_depth);
  try {
    return grammar.read();
  } catch (const Failure& failure) {
    throw ParseError(std::string(document), failure.offset, failure.expected, failure.max_depth_exceeded);
  }
}

}  // namespace

std::vector<Link> Parser::parse(std::string_view document) const {
  std::vector<Link> links;
  for (const RawLink& item : read_document(document, options_)) collect_links(item, {}, links);
  return links;
}

std::vector<LinksGroup> Parser::parse_groups(std::string_view document) const {
  std::vector<LinksGroup> groups;
  for (const RawLink& item : read_document(document, options_)) groups.push_back(transform_group(item));
  return groups;
}

std::vector<Link> parse(std::string_view document) { return Parser().parse(document); }

}  // namespace links_notation
