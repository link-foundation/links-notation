// A port of rust/links-notation/src/stream_parser.rs that reads the stream a
// byte at a time, so a chunk may end anywhere, even inside a character.

#include "links_notation/stream_parser.hpp"

#include <algorithm>
#include <utility>

#include "links_notation/comments.hpp"
#include "quotes.hpp"

namespace links_notation {

namespace {

constexpr std::string_view before_reference = " \t\n\r(:";
constexpr std::string_view before_comment = " \t\n\r";

std::size_t leading_spaces(std::string_view line) {
  std::size_t spaces = 0;
  while (spaces < line.size() && line[spaces] == ' ') ++spaces;
  return spaces;
}

bool follows(std::string_view document, std::size_t position, std::string_view allowed) {
  return position == 0 || allowed.find(document[position - 1]) != std::string_view::npos;
}

// Whether every delimited reference and parenthesized group in `document` is
// closed, so the record it holds could be complete.
bool structurally_complete(std::string_view document, bool comments) {
  const detail::DelimitedReferences references(document);
  std::size_t position = 0;
  long depth = 0;

  while (position < document.size()) {
    const char character = document[position];
    if (detail::is_quote(character) && follows(document, position, before_reference)) {
      const auto end = references.end_at(position);
      if (!end) return false;
      position = *end;
      continue;
    }
    if (comments && character == comment_character && follows(document, position, before_comment)) {
      const std::size_t newline = document.find('\n', position);
      if (newline == std::string_view::npos) break;
      position = newline + 1;
      continue;
    }
    if (character == '(') {
      ++depth;
    } else if (character == ')') {
      --depth;
    }
    ++position;
  }
  return depth == 0;
}

std::string with_location(const std::string& message, const std::optional<StreamPosition>& location) {
  if (!location) return "stream parse error: " + message;
  return "stream parse error at line " + std::to_string(location->line) + ", column " +
         std::to_string(location->column) + " (offset " + std::to_string(location->offset) + "): " + message;
}

}  // namespace

StreamParseError::StreamParseError(const std::string& message, std::optional<StreamPosition> location,
                                   std::optional<ParseError> parse_error)
    : std::runtime_error(with_location(message, location)),
      reason_(message),
      location_(location),
      parse_error_(std::move(parse_error)) {}

StreamParser::StreamParser() = default;

StreamParser::StreamParser(ParserOptions options) : parser_(options) {}

StreamParser& StreamParser::on_link(std::function<void(const Link&)> callback) {
  link_callback_ = std::move(callback);
  return *this;
}

StreamParser& StreamParser::on_error(std::function<void(const StreamParseError&)> callback) {
  error_callback_ = std::move(callback);
  return *this;
}

StreamParser& StreamParser::set_collect(bool collect) {
  collect_ = collect;
  return *this;
}

StreamParser& StreamParser::set_max_buffer_size(std::size_t max_buffer_size) {
  if (max_buffer_size == 0) fail(StreamParseError("maximum buffer size must be positive", position()));
  max_buffer_size_ = max_buffer_size;
  return *this;
}

std::vector<Link> StreamParser::write(std::string_view chunk) {
  if (ended_) fail(StreamParseError("cannot write after finish()", position()));

  std::vector<Link> emitted;
  for (const char character : chunk) {
    current_line_ += character;
    ++offset_;

    if (character == '\n') {
      buffer_ += current_line_;
      current_line_.clear();
      line_classified_ = false;
      ++line_;
      column_ = 1;
    } else {
      if (!line_classified_ && character != ' ' && character != '\t' && character != '\r') {
        line_classified_ = true;
        if (!(parser_.options().comments && character == comment_character)) {
          start_content_line(leading_spaces(current_line_), emitted);
        }
      }
      // Columns count code points, and a continuation byte only extends one.
      if ((static_cast<unsigned char>(character) & 0xC0) != 0x80) ++column_;
    }

    if (buffer_.size() + current_line_.size() > max_buffer_size_) {
      fail(StreamParseError("buffered record exceeds maximum size of " + std::to_string(max_buffer_size_) + " bytes",
                            position()));
    }
  }
  return emitted;
}

std::vector<Link> StreamParser::finish() {
  if (ended_) return collect_ ? links_ : std::vector<Link>();

  std::vector<Link> emitted;
  const std::string document = buffer_ + current_line_;
  if (!document.empty()) {
    std::vector<Link> parsed;
    try {
      parsed = parser_.parse(document);
    } catch (const ParseError& error) {
      fail(stream_error(error));
    }
    publish(std::move(parsed), emitted);
    advance_segment(document);
  }

  buffer_.clear();
  current_line_.clear();
  base_indentation_.reset();
  ended_ = true;
  return collect_ ? links_ : emitted;
}

std::vector<Link> StreamParser::drain() { return std::exchange(links_, {}); }

StreamParser& StreamParser::reset() {
  buffer_.clear();
  current_line_.clear();
  base_indentation_.reset();
  line_classified_ = false;
  links_.clear();
  offset_ = 0;
  line_ = 1;
  column_ = 1;
  segment_offset_ = 0;
  segment_line_ = 1;
  ended_ = false;
  return *this;
}

StreamPosition StreamParser::position() const {
  return StreamPosition{line_, column_, offset_, buffer_.size() + current_line_.size()};
}

void StreamParser::start_content_line(std::size_t indentation, std::vector<Link>& emitted) {
  if (!buffer_.empty() && base_indentation_ && indentation <= *base_indentation_ &&
      structurally_complete(buffer_, parser_.options().comments)) {
    try {
      std::vector<Link> parsed = parser_.parse(buffer_);
      const std::string document = std::exchange(buffer_, {});
      publish(std::move(parsed), emitted);
      advance_segment(document);
      base_indentation_.reset();
    } catch (const ParseError&) {
      // Not a record yet: the lines that follow may still complete it.
    }
  }
  if (!base_indentation_) base_indentation_ = indentation;
}

void StreamParser::publish(std::vector<Link> parsed, std::vector<Link>& emitted) {
  for (Link& link : parsed) {
    emitted.push_back(link);
    if (collect_) links_.push_back(link);
    if (link_callback_) link_callback_(link);
  }
}

void StreamParser::advance_segment(const std::string& document) {
  segment_offset_ += document.size();
  segment_line_ += static_cast<std::size_t>(std::count(document.begin(), document.end(), '\n'));
}

StreamParseError StreamParser::stream_error(const ParseError& error) const {
  // A segment always starts a line, so the column needs no adjustment.
  const StreamPosition location{segment_line_ + error.line() - 1, error.column(), segment_offset_ + error.offset(),
                                buffer_.size() + current_line_.size()};
  return StreamParseError(error.what(), location, error);
}

void StreamParser::fail(const StreamParseError& error) {
  if (error_callback_) error_callback_(error);
  throw error;
}

ChunkedLinks::ChunkedLinks(ChunkSource source, ParserOptions options) : source_(std::move(source)), parser_(options) {
  parser_.set_collect(false);
}

std::optional<Link> ChunkedLinks::next() {
  for (;;) {
    if (!ready_.empty()) {
      Link link = std::move(ready_.front());
      ready_.pop_front();
      return link;
    }
    if (finished_) return std::nullopt;
    std::optional<std::string> chunk = source_();
    std::vector<Link> links;
    if (chunk) {
      try {
        links = parser_.write(*chunk);
      } catch (const StreamParseError&) {
        finished_ = true;
        throw;
      }
    } else {
      finished_ = true;
      links = parser_.finish();
    }
    ready_.insert(ready_.end(), std::make_move_iterator(links.begin()), std::make_move_iterator(links.end()));
  }
}

}  // namespace links_notation
