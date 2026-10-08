package io.github.linkfoundation.linksnotation;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.regex.Pattern;

/** Version 1 lossless Unicode reference literals and readable legacy quoting. */
public final class ReferenceLiteral {
  private ReferenceLiteral() {}

  private static final Pattern PREFIX = Pattern.compile("^~[0-9]+\\{");
  private static final Pattern LITERAL = Pattern.compile("~([0-9]+)\\{([0-9a-fA-F]*)\\}");

  public static boolean hasPrefix(String text) {
    return PREFIX.matcher(text).find();
  }

  /** Encode exact Unicode as a version 1 UTF-8 hexadecimal literal. */
  public static String encode(String text) {
    validate(text);
    return "~1{" + HexFormat.of().formatHex(text.getBytes(StandardCharsets.UTF_8)) + "}";
  }

  /** Decode a complete literal; malformed UTF-8 and unsupported versions are refused. */
  public static String decode(String literal) {
    var match = LITERAL.matcher(literal);
    if (!match.matches() || !match.group(1).equals("1") || match.group(2).length() % 2 != 0) {
      throw new IllegalArgumentException(
          "Invalid or unsupported reference literal (expected ~1{UTF-8 hex})");
    }
    try {
      return StandardCharsets.UTF_8
          .newDecoder()
          .onMalformedInput(CodingErrorAction.REPORT)
          .onUnmappableCharacter(CodingErrorAction.REPORT)
          .decode(ByteBuffer.wrap(HexFormat.of().parseHex(match.group(2))))
          .toString();
    } catch (CharacterCodingException error) {
      throw new IllegalArgumentException("Reference literal must contain valid UTF-8", error);
    }
  }

  private static void validate(String text) {
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      if (Character.isHighSurrogate(c)
          && i + 1 < text.length()
          && Character.isLowSurrogate(text.charAt(i + 1))) {
        i++;
      } else if (Character.isSurrogate(c)) {
        throw new IllegalArgumentException("Reference must be well-formed Unicode text");
      }
    }
  }

  static String format(String text) {
    validate(text);
    if (text.isEmpty() || text.chars().anyMatch(c -> c < 32 || c == 127)) return encode(text);
    if (!hasPrefix(text)
        && !text.startsWith("#")
        && text.codePoints()
            .noneMatch(
                c ->
                    c == 0x85
                        || Character.isWhitespace(c)
                        || c == 0xfeff
                        || Character.isSpaceChar(c)
                        || "():\"'`".indexOf(c) >= 0)) return text;
    char chosen = 0;
    int count = Integer.MAX_VALUE;
    for (char quote : new char[] {'\'', '"', '`'}) {
      if (text.charAt(0) == quote) continue;
      int longest = 0, run = 0;
      for (int i = 0; i < text.length(); i++) {
        run = text.charAt(i) == quote ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
      int n = (longest + 1) | 1;
      if (n < count) {
        chosen = quote;
        count = n;
      }
    }
    String delimiter = String.valueOf(chosen).repeat(count);
    return delimiter + text + delimiter;
  }
}
