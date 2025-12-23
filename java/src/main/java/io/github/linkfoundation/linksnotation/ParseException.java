package io.github.linkfoundation.linksnotation;

/** Exception thrown when parsing Links Notation fails. */
public class ParseException extends Exception {

  private static final long serialVersionUID = 1L;

  /**
   * Creates a new ParseException with a message.
   *
   * @param message the error message
   */
  public ParseException(String message) {
    super(message);
  }

  /**
   * Creates a new ParseException with a message and cause.
   *
   * @param message the error message
   * @param cause the underlying cause
   */
  public ParseException(String message, Throwable cause) {
    super(message, cause);
  }
}
