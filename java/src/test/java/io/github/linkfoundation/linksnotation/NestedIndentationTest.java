package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Tests for indentation inside parentheses.
 *
 * <p>See https://github.com/link-foundation/links-notation/issues/282
 *
 * <p>Indentation is structural at the root, so it must be structural inside parentheses too: a
 * parenthesized group opens a nested context that starts fresh at indentation level zero and
 * follows exactly the root's rules.
 */
class NestedIndentationTest {

  private Parser parser;

  @BeforeEach
  void setUp() {
    parser = new Parser();
  }

  private String formatSource(String source) throws ParseException {
    return Link.formatLinks(parser.parse(source));
  }

  private void assertFormat(String source, String expected) throws ParseException {
    assertEquals(expected, formatSource(source), "Parsing " + source);
  }

  @Test
  void testParenthesesReproduceRootIndentation() throws ParseException {
    assertFormat("a\n  b\nc\n  d", "(a)\n((a) (b))\n(c)\n((c) (d))");

    // The same lines inside parentheses keep the same structure, nested under
    // the link the group belongs to.
    assertFormat("array (\n  a\n    b\n  c\n    d\n)", "(array ((a) ((a) (b)) (c) ((c) (d))))");
  }

  @Test
  void testParenthesesKeepRecordBoundaries() throws ParseException {
    String source = "value (\n  id \"1\"\n  label \"one\"\n)";
    assertFormat(source, "(value ((id 1) (label one)))");

    List<Link> links = parser.parse(source);
    assertEquals(1, links.size());

    Link group = links.get(0).getValues().get(1);
    assertNull(group.getId(), "Expected the group to be anonymous");
    assertEquals(2, group.getValues().size());
    assertEquals("id", group.getValues().get(0).getValues().get(0).getId());
    assertEquals("1", group.getValues().get(0).getValues().get(1).getId());
    assertEquals("label", group.getValues().get(1).getValues().get(0).getId());
    assertEquals("one", group.getValues().get(1).getValues().get(1).getId());
  }

  @Test
  void testParenthesesKeepSeveralRecordsSeparate() throws ParseException {
    assertFormat(
        "value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)",
        "(value ((id 1 label one) (id 2 label two)))");
  }

  @Test
  void testParenthesesNestDeeply() throws ParseException {
    assertFormat(
        "outer (\n  inner (\n    x 1\n    y 2\n  )\n  z 3\n)",
        "(outer ((inner ((x 1) (y 2))) (z 3)))");
  }

  @Test
  void testSingleLineParenthesesAreUnchanged() throws ParseException {
    assertFormat("(a b c)", "(a b c)");
    assertFormat("(1: 2 3)", "(1: 2 3)");
    assertFormat("(a: b c)", "(a: b c)");
    assertFormat("((a b))", "((a b))");
    assertFormat("(a)", "(a)");
    assertFormat("()", "()");
  }

  @Test
  void testParenthesesWithIndentedIdSyntax() throws ParseException {
    assertFormat("(\n  a:\n    b\n    c\n)", "(a: b c)");
  }

  @Test
  void testEmployeeRecordsKeepTheirFields() throws ParseException {
    String source =
        "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n"
            + "    (\n      name (Jean-Luc Picard)\n      age 45\n    )";
    String expected =
        "(empInfo)\n((empInfo) (employees: ((name (James Kirk)) (age 40))"
            + " ((name (Jean-Luc Picard)) (age 45))))";
    assertFormat(source, expected);
  }
}
