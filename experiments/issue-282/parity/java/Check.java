import io.github.linkfoundation.linksnotation.Link;
import io.github.linkfoundation.linksnotation.Parser;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/** Print what the Java implementation makes of the document. */
public final class Check {
  public static void main(String[] args) throws Exception {
    String document = new String(Files.readAllBytes(Path.of(args[0])), StandardCharsets.UTF_8);
    List<Link> links = new Parser().parse(document);
    StringBuilder formatted = new StringBuilder();
    for (Link link : links) {
      formatted.append(link.format(false));
    }
    System.out.println(formatted);
  }
}
