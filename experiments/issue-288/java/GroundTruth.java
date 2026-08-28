import io.github.linkfoundation.linksnotation.Link;
import io.github.linkfoundation.linksnotation.Parser;
import java.util.List;
import java.util.stream.Collectors;

/** Print the canonical rendering of every case in issue #288. */
public final class GroundTruth {
  private static final String[] CASES = {
    "(a \" \" b)", "(a \"\" b)", "(a '' b)", "(a `` b)",
    "(a \"\" \"\" b)", "(a '' '' b)", "(a `` `` b)",
    "(a \"\"x\"\" b)", "(a \"\"\"\" b)", "(x \"\" \" \"\")", "(x ' \" ')",
    "(\"\" (\"\" 1))", "(\"\" ('' 1))", "(\"x\" (\"\" 1))", "(\"\" (\"x\" 1))",
    "(\"\" x (\"\" 1))", "(\"\" 1 (\"\" 1))", "(o: (\"\" (o: (\"\" 1))))",
    "(a \" b)", "(a \"\"\" b)", "(\"\")", "(\"\": 1)", "(a \"\"  \"\" b)", "(\"\" \"\")",
  };

  private static String render(Link node) {
    if (node.getValues() == null || node.getValues().isEmpty()) {
      return "<" + (node.getId() == null ? "" : node.getId()) + ">";
    }
    String head = node.getId() == null ? "" : "<" + node.getId() + ">: ";
    return "("
        + head
        + node.getValues().stream().map(GroundTruth::render).collect(Collectors.joining(" "))
        + ")";
  }

  public static void main(String[] args) {
    Parser parser = new Parser();
    for (String source : CASES) {
      try {
        List<Link> links = parser.parse(source);
        System.out.printf(
            "%-24s => %s%n",
            source, links.stream().map(GroundTruth::render).collect(Collectors.joining("\n")));
      } catch (Exception e) {
        System.out.printf("%-24s => Err(%s: %s)%n", source, e.getClass().getSimpleName(), e.getMessage());
      }
    }
  }
}
