// Ported from js/tests/MixedIndentationModes.test.js.

import XCTest

@testable import LinksNotation

private let heroExampleMixedModes = """
    empInfo
      employees:
        (
          name (James Kirk)
          age 40
        )
        (
          name (Jean-Luc Picard)
          age 45
        )
        (
          name (Wesley Crusher)
          age 27
        )
    """

private let heroExampleAlternativeFormat = """
    empInfo
      (
        employees:
          (
            name (James Kirk)
            age 40
          )
          (
            name (Jean-Luc Picard)
            age 45
          )
          (
            name (Wesley Crusher)
            age 27
          )
      )
    """

final class MixedIndentationModesTests: XCTestCase {
    private let parser = Parser()

    func testHeroExampleMixedModes() throws {
        let result = try parser.parse(heroExampleMixedModes)

        XCTAssertGreaterThan(result.count, 0)
        let formatted = formatLinks(result)
        XCTAssertTrue(formatted.contains("empInfo"))
        XCTAssertTrue(formatted.contains("employees:"))
        XCTAssertTrue(formatted.contains("James Kirk"))
        XCTAssertTrue(formatted.contains("Jean-Luc Picard"))
        XCTAssertTrue(formatted.contains("Wesley Crusher"))
    }

    func testHeroExampleAlternativeFormat() throws {
        let result = try parser.parse(heroExampleAlternativeFormat)

        XCTAssertGreaterThan(result.count, 0)
        let formatted = formatLinks(result)
        XCTAssertTrue(formatted.contains("empInfo"))
        XCTAssertTrue(formatted.contains("employees:"))
        XCTAssertTrue(formatted.contains("James Kirk"))
        XCTAssertTrue(formatted.contains("Jean-Luc Picard"))
        XCTAssertTrue(formatted.contains("Wesley Crusher"))
    }

    func testHeroExampleEquivalence() throws {
        let formatted1 = formatLinks(try parser.parse(heroExampleMixedModes))
        let formatted2 = formatLinks(try parser.parse(heroExampleAlternativeFormat))

        XCTAssertEqual(formatted1, formatted2)
    }

    func testSetContextWithoutColon() throws {
        let input = "empInfo\n  employees"

        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        let formatted = formatLinks(result)
        XCTAssertTrue(formatted.contains("empInfo"))
        XCTAssertTrue(formatted.contains("employees"))
    }

    func testSequenceContextWithColon() throws {
        let input = """
            employees:
              James Kirk
              Jean-Luc Picard
              Wesley Crusher
            """

        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        XCTAssertEqual(result.count, 1)
        let formatted = formatLinks(result)
        XCTAssertTrue(formatted.contains("employees:"))
        XCTAssertTrue(formatted.contains("James Kirk"))
        XCTAssertTrue(formatted.contains("Jean-Luc Picard"))
        XCTAssertTrue(formatted.contains("Wesley Crusher"))
    }

    func testSequenceContextWithComplexValues() throws {
        let input = """
            employees:
              (
                name (James Kirk)
                age 40
              )
              (
                name (Jean-Luc Picard)
                age 45
              )
            """

        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        XCTAssertEqual(result.count, 1)
        let formatted = formatLinks(result)
        XCTAssertTrue(formatted.contains("employees:"))
        XCTAssertTrue(formatted.contains("James Kirk"))
        XCTAssertTrue(formatted.contains("Jean-Luc Picard"))
    }

    func testNestedSetAndSequenceContexts() throws {
        let input = """
            company
              departments:
                engineering
                sales
              employees:
                (name John)
                (name Jane)
            """

        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        let formatted = formatLinks(result)
        XCTAssertTrue(formatted.contains("company"))
        XCTAssertTrue(formatted.contains("departments:"))
        XCTAssertTrue(formatted.contains("employees:"))
    }

    func testDeeplyNestedMixedModes() throws {
        let input = """
            root
              level1
                level2:
                  value1
                  value2
                level2b
                  level3
            """

        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        let formatted = formatLinks(result)
        XCTAssertTrue(formatted.contains("root"))
        XCTAssertTrue(formatted.contains("level2:"))
    }
}
