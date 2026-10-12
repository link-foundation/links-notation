// Incremental parsing for long-lived Links Notation streams.

#ifndef LINKS_NOTATION_STREAM_PARSER_HPP
#define LINKS_NOTATION_STREAM_PARSER_HPP

#include <cstddef>
#include <deque>
#include <functional>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#include "links_notation/link.hpp"
#include "links_notation/parse_error.hpp"
#include "links_notation/parser.hpp"

namespace links_notation {

/// The largest unresolved record a StreamParser holds when nothing says otherwise.
inline constexpr std::size_t default_max_buffer_size = 10 * 1024 * 1024;

/// The point immediately after the last byte written to a stream parser.
struct StreamPosition {
  /// Line, counted from 1.
  std::size_t line = 1;
  /// Column, in code points, counted from 1.
  std::size_t column = 1;
  /// Byte offset from the start of the stream.
  std::size_t offset = 0;
  /// Bytes held for the one unresolved top-level record.
  std::size_t buffered = 0;

  bool operator==(const StreamPosition& other) const {
    return line == other.line && column == other.column && offset == other.offset && buffered == other.buffered;
  }
  bool operator!=(const StreamPosition& other) const { return !(*this == other); }
};

/// A parser or stream-limit error, located in the whole stream rather than in
/// the record that was buffered when it happened.
class StreamParseError : public std::runtime_error {
 public:
  StreamParseError(const std::string& message, std::optional<StreamPosition> location,
                   std::optional<ParseError> parse_error = std::nullopt);

  /// What went wrong, without the location.
  const std::string& reason() const { return reason_; }
  /// Where in the stream it went wrong, when that is known.
  const std::optional<StreamPosition>& location() const { return location_; }
  /// The parser's own error, when a completed record did not parse.
  const std::optional<ParseError>& parse_error() const { return parse_error_; }

 private:
  std::string reason_;
  std::optional<StreamPosition> location_;
  std::optional<ParseError> parse_error_;
};

/// Incrementally emits complete top-level Links Notation records.
///
/// A record can acquire indented children, so a terminating line break is not
/// by itself a safe boundary. A record is committed when the next non-indented
/// content line begins, and the parser validates every committed segment.
/// Turn collection off to process an unbounded stream through the callback or
/// the links each write returns, in bounded memory.
class StreamParser {
 public:
  StreamParser();
  explicit StreamParser(ParserOptions options);

  /// Calls `callback` once for every completed link.
  StreamParser& on_link(std::function<void(const Link&)> callback);
  /// Calls `callback` with every error before it is thrown.
  StreamParser& on_error(std::function<void(const StreamParseError&)> callback);
  /// Whether links are retained for finish and drain.
  StreamParser& set_collect(bool collect);
  /// The largest unresolved record the stream accepts; throws
  /// StreamParseError when it is zero.
  StreamParser& set_max_buffer_size(std::size_t max_buffer_size);

  /// Consumes a chunk and returns the links it completed. A chunk may end in
  /// the middle of a line, a reference or a UTF-8 sequence.
  std::vector<Link> write(std::string_view chunk);

  /// Ends the stream. Returns every retained link when collecting, and the
  /// links completed by this call otherwise.
  std::vector<Link> finish();

  /// Returns and forgets the retained links.
  std::vector<Link> drain();

  /// Makes the parser reusable, keeping its options and callbacks.
  StreamParser& reset();

  /// The position in the stream and the size of the unresolved record.
  StreamPosition position() const;

 private:
  void start_content_line(std::size_t indentation, std::vector<Link>& emitted);
  void publish(std::vector<Link> parsed, std::vector<Link>& emitted);
  void advance_segment(const std::string& document);
  StreamParseError stream_error(const ParseError& error) const;
  [[noreturn]] void fail(const StreamParseError& error);

  Parser parser_;
  std::string buffer_;
  std::string current_line_;
  std::optional<std::size_t> base_indentation_;
  bool line_classified_ = false;
  std::function<void(const Link&)> link_callback_;
  std::function<void(const StreamParseError&)> error_callback_;
  bool collect_ = true;
  std::size_t max_buffer_size_ = default_max_buffer_size;
  std::vector<Link> links_;
  std::size_t offset_ = 0;
  std::size_t line_ = 1;
  std::size_t column_ = 1;
  std::size_t segment_offset_ = 0;
  std::size_t segment_line_ = 1;
  bool ended_ = false;
};

/// Reads links lazily from a source of chunks, which returns no chunk once the
/// stream has ended.
class ChunkedLinks {
 public:
  using ChunkSource = std::function<std::optional<std::string>()>;

  explicit ChunkedLinks(ChunkSource source, ParserOptions options = {});

  /// The next link, or nothing after the last one. Throws StreamParseError
  /// when the stream does not parse.
  std::optional<Link> next();

 private:
  ChunkSource source_;
  StreamParser parser_;
  std::deque<Link> ready_;
  bool finished_ = false;
};

/// Reads links lazily from a sequence of chunks.
template <typename Chunks>
ChunkedLinks parse_chunks(Chunks chunks, ParserOptions options = {}) {
  auto held = std::make_shared<Chunks>(std::move(chunks));
  auto position = std::make_shared<decltype(std::begin(*held))>(std::begin(*held));
  return ChunkedLinks(
      [held, position]() -> std::optional<std::string> {
        if (*position == std::end(*held)) return std::nullopt;
        std::string chunk(**position);
        ++*position;
        return chunk;
      },
      options);
}

}  // namespace links_notation

#endif  // LINKS_NOTATION_STREAM_PARSER_HPP
