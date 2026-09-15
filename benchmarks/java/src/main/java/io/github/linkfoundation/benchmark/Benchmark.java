package io.github.linkfoundation.benchmark;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.knuddels.jtokkit.Encodings;
import com.knuddels.jtokkit.api.Encoding;
import com.knuddels.jtokkit.api.EncodingRegistry;
import com.knuddels.jtokkit.api.EncodingType;
import io.github.linkfoundation.linksnotation.Parser;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Java side of the Links Notation token efficiency benchmarks.
 *
 * <p>The Rust benchmark is the one that writes the documents and the report. Every other language
 * answers the two questions that make those numbers portable rather than a property of one
 * implementation:
 *
 * <ol>
 *   <li>does this language's own links-notation parser accept the generated Links Notation
 *       documents;
 *   <li>does this language's own tokenizer count them the same way.
 * </ol>
 *
 * <p>It writes {@code benchmarks/results/java.json} and fails when a count differs from {@code
 * benchmarks/results/rust.json}.
 *
 * <p>Usage: {@code mvn -q exec:java -Dexec.args="--check --verbose"} from {@code benchmarks/java}.
 * With {@code --check} the results file is compared instead of written, which is what CI runs to
 * catch a stale commit.
 */
public final class Benchmark {

  private static final String LANGUAGE = "java";

  /** The order the measurements are reported in, shared by every language. */
  private static final List<String> METRIC_KEYS =
      List.of("tokens_o200k", "tokens_cl100k", "chars", "bytes");

  private Benchmark() {}

  public static void main(String[] arguments) {
    boolean check = List.of(arguments).contains("--check");
    boolean verbose =
        List.of(arguments).contains("--verbose") || "true".equals(System.getenv("CI_VERBOSE"));
    try {
      run(check, verbose);
    } catch (Exception failure) {
      System.err.println(LANGUAGE + ": " + failure.getMessage());
      System.exit(1);
    }
  }

  private static void run(boolean check, boolean verbose) throws Exception {
    Path root = benchmarksDirectory();
    Gson gson = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();

    EncodingRegistry registry = Encodings.newDefaultEncodingRegistry();
    Encoding o200k = registry.getEncoding(EncodingType.O200K_BASE);
    Encoding cl100k = registry.getEncoding(EncodingType.CL100K_BASE);

    JsonObject index = gson.fromJson(readText(root, "generated/index.json"), JsonObject.class);
    Parser parser = new Parser();

    JsonArray datasets = new JsonArray();
    Map<String, Map<String, Integer>> totals = new TreeMap<>();

    for (JsonElement element : index.getAsJsonArray("representations")) {
      JsonObject entry = element.getAsJsonObject();
      JsonObject files = entry.getAsJsonObject("files");
      Map<String, JsonObject> formats = new TreeMap<>();

      for (String format : new TreeMap<>(files.asMap()).keySet()) {
        String path = files.get(format).getAsString();
        String text = readText(root, path);
        if (format.startsWith("lino")) {
          // Parsing with this language's own implementation is the
          // point: a document only counts if the notation is portable.
          parser.parse(text);
        }
        Map<String, Integer> metrics = measure(text, o200k, cl100k);
        formats.put(format, toJson(metrics));
        Map<String, Integer> running = totals.computeIfAbsent(format, key -> zeroed());
        for (String key : METRIC_KEYS) {
          running.put(key, running.get(key) + metrics.get(key));
        }
      }

      if (verbose) {
        System.err.println(
            entry.get("dataset").getAsString() + ": measured " + formats.size() + " formats");
      }

      JsonObject dataset = new JsonObject();
      dataset.addProperty("name", entry.get("dataset").getAsString());
      dataset.addProperty("structure", entry.get("structure").getAsString());
      dataset.addProperty("profile", entry.get("profile").getAsString());
      JsonObject byFormat = new JsonObject();
      formats.forEach(byFormat::add);
      dataset.add("formats", byFormat);
      datasets.add(dataset);
    }

    JsonObject tokenizers = new JsonObject();
    tokenizers.addProperty("primary", "o200k_base");
    tokenizers.addProperty("secondary", "cl100k_base");

    JsonObject results = new JsonObject();
    results.addProperty("schema", index.get("schema").getAsInt());
    results.addProperty("generator", LANGUAGE);
    results.add("tokenizers", tokenizers);
    results.add("datasets", datasets);
    JsonObject totalsJson = new JsonObject();
    totals.forEach((format, metrics) -> totalsJson.add(format, toJson(metrics)));
    results.add("totals", totalsJson);

    JsonObject reference = gson.fromJson(readText(root, "results/rust.json"), JsonObject.class);
    List<String> differences = compare(results, reference);
    if (!differences.isEmpty()) {
      System.err.println(
          LANGUAGE + ": " + differences.size() + " measurement(s) differ from the Rust results:");
      differences.stream().limit(20).forEach(line -> System.err.println("  - " + line));
      throw new IllegalStateException("results do not agree with Rust");
    }

    String text = gson.toJson(results) + "\n";
    String path = "results/" + LANGUAGE + ".json";
    if (check) {
      if (!text.equals(readText(root, path))) {
        throw new IllegalStateException(
            path + " is out of date; run mvn exec:java from benchmarks/java");
      }
      System.out.println(
          LANGUAGE + ": " + path + " is up to date and agrees with the Rust results.");
      return;
    }
    Files.write(root.resolve(path), text.getBytes(StandardCharsets.UTF_8));
    System.out.println(
        LANGUAGE + ": wrote " + path + "; every measurement agrees with the Rust results.");
  }

  /**
   * The four measurements taken of every document.
   *
   * <p>{@code chars} counts code points rather than {@code char} values, so a character outside the
   * basic plane counts once here and once in every other language. {@code countTokensOrdinary}
   * treats a sequence such as {@code <|endoftext|>} as text, which is what data read from a file
   * is.
   */
  private static Map<String, Integer> measure(String text, Encoding o200k, Encoding cl100k) {
    Map<String, Integer> metrics = new LinkedHashMap<>();
    metrics.put("tokens_o200k", o200k.countTokensOrdinary(text));
    metrics.put("tokens_cl100k", cl100k.countTokensOrdinary(text));
    metrics.put("chars", text.codePointCount(0, text.length()));
    metrics.put("bytes", text.getBytes(StandardCharsets.UTF_8).length);
    return metrics;
  }

  private static Map<String, Integer> zeroed() {
    Map<String, Integer> metrics = new LinkedHashMap<>();
    METRIC_KEYS.forEach(key -> metrics.put(key, 0));
    return metrics;
  }

  private static JsonObject toJson(Map<String, Integer> metrics) {
    JsonObject object = new JsonObject();
    METRIC_KEYS.forEach(key -> object.addProperty(key, metrics.get(key)));
    return object;
  }

  /** Every measurement that differs from the reference results. */
  private static List<String> compare(JsonObject results, JsonObject reference) {
    Map<String, JsonObject> byName = new LinkedHashMap<>();
    for (JsonElement element : reference.getAsJsonArray("datasets")) {
      JsonObject dataset = element.getAsJsonObject();
      byName.put(dataset.get("name").getAsString(), dataset);
    }
    List<String> differences = new ArrayList<>();
    for (JsonElement element : results.getAsJsonArray("datasets")) {
      JsonObject dataset = element.getAsJsonObject();
      String name = dataset.get("name").getAsString();
      JsonObject expected = byName.get(name);
      if (expected == null) {
        differences.add(name + ": missing from the Rust results");
        continue;
      }
      JsonObject expectedFormats = expected.getAsJsonObject("formats");
      for (Map.Entry<String, JsonElement> entry : dataset.getAsJsonObject("formats").entrySet()) {
        JsonObject other = expectedFormats.getAsJsonObject(entry.getKey());
        for (String key : METRIC_KEYS) {
          int value = entry.getValue().getAsJsonObject().get(key).getAsInt();
          Integer reported = other == null ? null : other.get(key).getAsInt();
          if (reported == null || reported != value) {
            differences.add(
                name
                    + "/"
                    + entry.getKey()
                    + "/"
                    + key
                    + ": "
                    + value
                    + " here, "
                    + reported
                    + " in Rust");
          }
        }
      }
    }
    return differences;
  }

  /**
   * The benchmarks directory, found from the working directory so the command runs from the
   * repository root as well as from its own directory.
   */
  private static Path benchmarksDirectory() {
    String fromEnvironment = System.getenv("BENCHMARKS_DIR");
    if (fromEnvironment != null && !fromEnvironment.isEmpty()) {
      return Paths.get(fromEnvironment);
    }
    Path current = Paths.get("").toAbsolutePath();
    while (current != null) {
      if (Files.exists(current.resolve("benchmarks/generated/index.json"))) {
        return current.resolve("benchmarks");
      }
      if (Files.exists(current.resolve("generated/index.json"))) {
        return current;
      }
      current = current.getParent();
    }
    throw new IllegalStateException("no benchmarks directory above the working directory");
  }

  /**
   * The bytes of a file decoded as UTF-8, with no newline translation, so the CRLF line endings RFC
   * 4180 asks of CSV are counted rather than collapsed.
   */
  private static String readText(Path root, String path) throws IOException {
    return new String(Files.readAllBytes(root.resolve(path)), StandardCharsets.UTF_8);
  }
}
