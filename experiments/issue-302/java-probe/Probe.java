import io.github.linkfoundation.linksnotation.Parser;
import java.util.List;

public class Probe {
  public static void main(String[] args) {
    String[] docs = {"# ok line\n# break: two\nci_gate x\n", "a: b: c", "a (b\n", "a b)\n", ":"};
    for (String doc : docs) {
      try {
        List<?> links = new Parser().parse(doc);
        System.out.println(quote(doc) + " -> PARSED " + links.size() + " links");
      } catch (Throwable e) {
        System.out.println(quote(doc) + " -> " + e.getClass().getSimpleName() + ": " + e.getMessage());
      }
    }
  }

  static String quote(String s) {
    return "\"" + s.replace("\n", "\\n") + "\"";
  }
}
