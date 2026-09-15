package io.github.linkfoundation.linksnotation;

/** Unchecked wrapper used when a lazy Java Stream encounters invalid input. */
public final class StreamParseRuntimeException extends RuntimeException {
  private static final long serialVersionUID = 1L;

  StreamParseRuntimeException(ParseException cause) {
    super(cause);
  }

  @Override
  public synchronized ParseException getCause() {
    return (ParseException) super.getCause();
  }
}
