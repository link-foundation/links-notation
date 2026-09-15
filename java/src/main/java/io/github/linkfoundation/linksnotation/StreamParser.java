package io.github.linkfoundation.linksnotation;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.Iterator;
import java.util.List;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.Consumer;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

/** Incrementally emits complete top-level Links Notation records. */
public final class StreamParser {
  private static final int DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;
  private static final String BEFORE_REFERENCE = " \t\n\r(:";
  private static final String BEFORE_COMMENT = " \t\n\r";

  /** Point immediately after the last character written. */
  public record Position(int offset, int line, int column, int buffered) {}

  private final Parser parser;
  private Consumer<Link> onLink;
  private boolean collect = true;
  private int maxBufferSize;
  private final StringBuilder buffer = new StringBuilder();
  private final StringBuilder currentLine = new StringBuilder();
  private Integer baseIndentation;
  private boolean lineClassified;
  private final List<Link> links = new ArrayList<>();
  private int offset;
  private int line;
  private int column;
  private int segmentOffset;
  private int segmentLine;
  private boolean ended;

  /** Creates a stream parser with default canonical parser options. */
  public StreamParser() {
    this(new Parser());
  }

  /** Creates a stream parser backed by the supplied canonical parser. */
  public StreamParser(Parser parser) {
    if (parser == null) {
      throw new IllegalArgumentException("Parser must not be null");
    }
    this.parser = parser;
    this.maxBufferSize = Math.min(DEFAULT_MAX_BUFFER_SIZE, parser.getMaxInputSize());
    reset();
  }

  /** Register a consumer called once for every completed link. */
  public StreamParser onLink(Consumer<Link> consumer) {
    this.onLink = consumer;
    return this;
  }

  /** Enable or disable retaining emitted links for finish and drain. */
  public StreamParser collect(boolean value) {
    this.collect = value;
    return this;
  }

  /** Set the largest unresolved record accepted by this stream. */
  public StreamParser maxBufferSize(int value) {
    if (value < 1) {
      throw new IllegalArgumentException("Maximum buffer size must be positive");
    }
    this.maxBufferSize = value;
    return this;
  }

  /** Consume a chunk and return the links made complete by it. */
  public List<Link> write(String chunk) throws ParseException {
    if (chunk == null) {
      throw new IllegalArgumentException("Input must not be null");
    }
    if (ended) {
      throw new IllegalStateException("Cannot write after finish()");
    }

    List<Link> emitted = new ArrayList<>();
    for (int index = 0; index < chunk.length(); index++) {
      char character = chunk.charAt(index);
      currentLine.append(character);
      offset++;

      if (character == '\n') {
        buffer.append(currentLine);
        currentLine.setLength(0);
        lineClassified = false;
        line++;
        column = 1;
      } else {
        if (!lineClassified && character != ' ' && character != '\t' && character != '\r') {
          lineClassified = true;
          if (!(parser.isCommentsEnabled() && character == Comments.COMMENT)) {
            startContentLine(leadingSpaces(currentLine), emitted);
          }
        }
        column++;
      }

      if (buffer.length() + currentLine.length() > maxBufferSize) {
        throw new IllegalArgumentException(
            "Buffered record exceeds maximum size of " + maxBufferSize + " characters");
      }
    }
    return emitted;
  }

  /** Finish the stream and return all undrained links. */
  public List<Link> finish() throws ParseException {
    return finish("");
  }

  /** Consume a final chunk, finish the stream, and return its result. */
  public List<Link> finish(String chunk) throws ParseException {
    if (ended) {
      if (!chunk.isEmpty()) {
        throw new IllegalStateException("Cannot write after finish()");
      }
      return collect ? List.copyOf(links) : List.of();
    }

    List<Link> emitted = chunk.isEmpty() ? new ArrayList<>() : write(chunk);
    String document = buffer.toString() + currentLine;
    if (!document.isEmpty()) {
      List<Link> parsed;
      try {
        parsed = parser.parse(document);
      } catch (ParseException error) {
        throw new StreamParseException(error, segmentOffset, segmentLine, 1);
      }
      publish(parsed, emitted);
      advanceSegment(document);
    }

    buffer.setLength(0);
    currentLine.setLength(0);
    baseIndentation = null;
    ended = true;
    return collect ? List.copyOf(links) : emitted;
  }

  /** Return and forget links retained since the previous drain. */
  public List<Link> drain() {
    List<Link> drained = List.copyOf(links);
    links.clear();
    return drained;
  }

  /** Reuse the parser while preserving configuration and its consumer. */
  public StreamParser reset() {
    buffer.setLength(0);
    currentLine.setLength(0);
    baseIndentation = null;
    lineClassified = false;
    links.clear();
    offset = 0;
    line = 1;
    column = 1;
    segmentOffset = 0;
    segmentLine = 1;
    ended = false;
    return this;
  }

  /** Return the absolute stream position and unresolved buffer size. */
  public Position position() {
    return new Position(offset, line, column, buffer.length() + currentLine.length());
  }

  /** Lazily parse an iterable of chunks as a native Java Stream. */
  public static Stream<Link> parseChunks(Iterable<String> chunks) {
    Iterator<String> input = chunks.iterator();
    StreamParser parser = new StreamParser().collect(false);
    Deque<Link> ready = new ArrayDeque<>();
    Spliterator<Link> iterator =
        new Spliterators.AbstractSpliterator<>(
            Long.MAX_VALUE, Spliterator.ORDERED | Spliterator.NONNULL) {
          private boolean finished;

          @Override
          public boolean tryAdvance(Consumer<? super Link> action) {
            while (ready.isEmpty() && !finished) {
              try {
                if (input.hasNext()) {
                  ready.addAll(parser.write(input.next()));
                } else {
                  ready.addAll(parser.finish());
                  finished = true;
                }
              } catch (ParseException error) {
                throw new StreamParseRuntimeException(error);
              }
            }
            Link next = ready.pollFirst();
            if (next == null) {
              return false;
            }
            action.accept(next);
            return true;
          }
        };
    return StreamSupport.stream(iterator, false);
  }

  private void startContentLine(int indentation, List<Link> emitted) {
    if (buffer.length() > 0
        && baseIndentation != null
        && indentation <= baseIndentation
        && structurallyComplete(buffer, parser.isCommentsEnabled())) {
      try {
        List<Link> parsed = parser.parse(buffer.toString());
        publish(parsed, emitted);
        advanceSegment(buffer.toString());
        buffer.setLength(0);
        baseIndentation = null;
      } catch (ParseException ignored) {
        // A prefix rejected by the canonical parser may become valid with more input.
      }
    }
    if (baseIndentation == null) {
      baseIndentation = indentation;
    }
  }

  private void publish(List<Link> parsed, List<Link> emitted) {
    for (Link link : parsed) {
      emitted.add(link);
      if (collect) {
        links.add(link);
      }
      if (onLink != null) {
        onLink.accept(link);
      }
    }
  }

  private void advanceSegment(String document) {
    segmentOffset += document.length();
    segmentLine += (int) document.chars().filter(character -> character == '\n').count();
  }

  private static int leadingSpaces(CharSequence line) {
    int indentation = 0;
    while (indentation < line.length() && line.charAt(indentation) == ' ') {
      indentation++;
    }
    return indentation;
  }

  private static boolean structurallyComplete(CharSequence document, boolean comments) {
    String text = document.toString();
    int depth = 0;
    for (int position = 0; position < text.length(); position++) {
      char character = text.charAt(position);
      if (isQuote(character) && follows(text, position, BEFORE_REFERENCE)) {
        int end = Parser.quotedReferenceEnd(text, position);
        if (end < 0) {
          return false;
        }
        position = end - 1;
        continue;
      }
      if (comments && character == Comments.COMMENT && follows(text, position, BEFORE_COMMENT)) {
        int newline = text.indexOf('\n', position);
        if (newline < 0) {
          break;
        }
        position = newline;
        continue;
      }
      if (character == '(') {
        depth++;
      } else if (character == ')') {
        depth--;
      }
    }
    return depth == 0;
  }

  private static boolean isQuote(char character) {
    return character == '"' || character == '\'' || character == '`';
  }

  private static boolean follows(String document, int position, String allowed) {
    return position == 0 || allowed.indexOf(document.charAt(position - 1)) >= 0;
  }
}
