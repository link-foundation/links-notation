package io.github.linkfoundation.linksnotation;

/**
 * Exception thrown when attempting to access the getId() method on a multi-reference Link.
 *
 * <p>A multi-reference Link is one that has more than one element in its ids list,
 * representing a multi-word identifier like "some example" before a colon.
 *
 * <p>When this exception is thrown, use {@link Link#getIds()} instead of {@link Link#getId()}.
 */
public class MultiReferenceException extends RuntimeException {

  private final int referenceCount;

  /**
   * Constructs a new MultiReferenceException.
   *
   * @param referenceCount the number of references in the multi-reference ID
   */
  public MultiReferenceException(int referenceCount) {
    super(
        "This link has a multi-reference id with "
            + referenceCount
            + " parts. Use 'getIds()' instead of 'getId()'.");
    this.referenceCount = referenceCount;
  }

  /**
   * Gets the number of references in the multi-reference ID.
   *
   * @return the reference count
   */
  public int getReferenceCount() {
    return referenceCount;
  }
}
