import io.github.linkfoundation.linksnotation.Link;
import io.github.linkfoundation.linksnotation.Parser;
import java.util.List;
import java.util.stream.Collectors;

public class Probe {
  public static void main(String[] args) {
    String[] docs = {
      "# a b\n",
      "# a: b\n",
      "a: b # note\n",
      "a#b\n",
      "\"#\" a\n",
      "parent\n  # what the child is for\n  child\n"
    };
    for (String doc : docs) {
      try {
        List<Link> links = new Parser().parse(doc);
        String shown = links.stream().map(Link::toString).collect(Collectors.joining(" "));
        System.out.println(quote(doc) + " -> PARSED [" + shown + "]");
      } catch (Throwable error) {
        System.out.println(
            quote(doc) + " -> " + error.getClass().getSimpleName() + ": " + error.getMessage());
      }
    }
  }

  static String quote(String text) {
    return "\"" + text.replace("\n", "\\n") + "\"";
  }
}
