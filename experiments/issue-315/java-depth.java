// Measures how deep the Java parser gets on a 512 KiB thread stack with no
// nesting limit, for each shape of nesting (#315).
//
//   cd java && mvn -q compile && java -cp target/classes ../experiments/issue-315/java-depth.java
import io.github.linkfoundation.linksnotation.Parser;
import java.util.function.IntFunction;

public class Depth {
  static final int STACK = 512 * 1024;

  static String parens(int d) { return "(".repeat(d) + "a" + ")".repeat(d); }
  static String values(int d) { return "(a ".repeat(d) + "b" + ")".repeat(d); }
  static String indentation(int d) {
    StringBuilder s = new StringBuilder();
    for (int l = 0; l <= d; l++) s.append(" ".repeat(l)).append("a\n");
    return s.toString();
  }

  static boolean fits(String document) throws InterruptedException {
    boolean[] ok = {false};
    Thread t = new Thread(null, () -> {
      try {
        new Parser(Integer.MAX_VALUE, Integer.MAX_VALUE).parse(document);
        ok[0] = true;
      } catch (StackOverflowError e) {
        ok[0] = false;
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    }, "probe", STACK);
    t.start();
    t.join();
    return ok[0];
  }

  static int deepest(IntFunction<String> shape) throws InterruptedException {
    int low = 1, high = 1;
    while (fits(shape.apply(high))) { low = high; high *= 2; }
    while (high - low > 1) {
      int mid = (low + high) / 2;
      if (fits(shape.apply(mid))) low = mid; else high = mid;
    }
    return low;
  }

  public static void main(String[] args) throws Exception {
    for (int round = 1; round <= 3; round++) {
      System.out.printf("round %d: parens %d, values %d, indentation %d%n", round,
          deepest(Depth::parens), deepest(Depth::values), deepest(Depth::indentation));
    }
  }
}
