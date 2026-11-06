import io.github.linkfoundation.linksnotation.Parser;

/** A consumer compiled using only the public Maven Central JAR. */
class Consumer {
  public static void main(String[] args) throws Exception {
    var parser = new Parser();
    var links = parser.parse("(published: hello world)");
    if (links.size() != 1 || !links.get(0).toString().equals("(published: hello world)")) {
      throw new AssertionError("Unexpected public Java package output: " + links);
    }
    if (!parser.parse(links.get(0).toString()).equals(links)) {
      throw new AssertionError("Public Java package failed its round trip");
    }
    System.out.println("Public Java parser/formatter consumer passed");
  }
}
