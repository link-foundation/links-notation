import { test, expect } from "bun:test";
import { Parser } from "../src/Parser.js";
import { formatLinks } from "../src/Link.js";

const parser = new Parser();

test("Hero example mixed modes", () => {
  const input = `empInfo
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
    )`;

  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  const formatted = formatLinks(result);
  expect(formatted).toContain("empInfo");
  expect(formatted).toContain("employees:");
  expect(formatted).toContain("James Kirk");
  expect(formatted).toContain("Jean-Luc Picard");
  expect(formatted).toContain("Wesley Crusher");
});

test("Hero example alternative format", () => {
  const input = `empInfo
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
  )`;

  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  const formatted = formatLinks(result);
  expect(formatted).toContain("empInfo");
  expect(formatted).toContain("employees:");
  expect(formatted).toContain("James Kirk");
  expect(formatted).toContain("Jean-Luc Picard");
  expect(formatted).toContain("Wesley Crusher");
});

test("Hero example equivalence", () => {
  const version1 = `empInfo
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
    )`;

  const version2 = `empInfo
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
  )`;

  const result1 = parser.parse(version1);
  const result2 = parser.parse(version2);

  const formatted1 = formatLinks(result1);
  const formatted2 = formatLinks(result2);

  expect(formatted1).toBe(formatted2);
});

test("Set context without colon", () => {
  const input = `empInfo
  employees`;

  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  const formatted = formatLinks(result);
  expect(formatted).toContain("empInfo");
  expect(formatted).toContain("employees");
});

test("Sequence context with colon", () => {
  const input = `employees:
  James Kirk
  Jean-Luc Picard
  Wesley Crusher`;

  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  expect(result.length).toBe(1);
  const formatted = formatLinks(result);
  expect(formatted).toContain("employees:");
  expect(formatted).toContain("James Kirk");
  expect(formatted).toContain("Jean-Luc Picard");
  expect(formatted).toContain("Wesley Crusher");
});

test("Sequence context with complex values", () => {
  const input = `employees:
  (
    name (James Kirk)
    age 40
  )
  (
    name (Jean-Luc Picard)
    age 45
  )`;

  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  expect(result.length).toBe(1);
  const formatted = formatLinks(result);
  expect(formatted).toContain("employees:");
  expect(formatted).toContain("James Kirk");
  expect(formatted).toContain("Jean-Luc Picard");
});

test("Nested set and sequence contexts", () => {
  const input = `company
  departments:
    engineering
    sales
  employees:
    (name John)
    (name Jane)`;

  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  const formatted = formatLinks(result);
  expect(formatted).toContain("company");
  expect(formatted).toContain("departments:");
  expect(formatted).toContain("employees:");
});

test("Deeply nested mixed modes", () => {
  const input = `root
  level1
    level2:
      value1
      value2
    level2b
      level3`;

  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  const formatted = formatLinks(result);
  expect(formatted).toContain("root");
  expect(formatted).toContain("level2:");
});
