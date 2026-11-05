using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests;

public static class SharedTextParityTests
{
    private static object[] Tree(IEnumerable<Link<string>> links) => links
        .Select(link => (object)new { id = link.Id, values = Tree(link.Values ?? Array.Empty<Link<string>>()) }).ToArray();

    [Fact(Timeout = 30000)]
    public static void SharedTextParity()
    {
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Protocol", "text-fixtures.json")));
        Assert.NotEmpty(document.RootElement.EnumerateArray());
        foreach (var fixture in document.RootElement.EnumerateArray())
        {
            TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
            var input = fixture.GetProperty("input").GetString()!;
            var formatted = fixture.GetProperty("format").GetString()!;
            var expected = fixture.GetProperty("expected");
            var parsed = new Parser().Parse(input);
            Assert.True(JsonElement.DeepEquals(expected, JsonSerializer.SerializeToElement(Tree(parsed))));
            Assert.Equal(formatted, string.Concat(parsed.Select(link => link.ToString())));
            Assert.True(JsonElement.DeepEquals(expected, JsonSerializer.SerializeToElement(Tree(new Parser().Parse(formatted)))));
            var stream = new StreamParser();
            foreach (var character in input) stream.Write(character.ToString());
            Assert.True(JsonElement.DeepEquals(expected, JsonSerializer.SerializeToElement(Tree(stream.Finish()))));
        }
    }

    [Fact(Timeout = 30000)]
    public static void SharedLessParenthesesRoundTrip()
    {
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Protocol", "text-fixtures.json")));
        Assert.NotEmpty(document.RootElement.EnumerateArray());
        foreach (var fixture in document.RootElement.EnumerateArray())
        {
            TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
            var lessParentheses = fixture.GetProperty("lessParentheses").GetString()!;
            var expected = fixture.GetProperty("expected");
            var parsed = new Parser().Parse(fixture.GetProperty("input").GetString()!);
            Assert.Equal(lessParentheses, parsed.Format(new FormatOptions { LessParentheses = true }));
            Assert.True(JsonElement.DeepEquals(expected, JsonSerializer.SerializeToElement(Tree(new Parser().Parse(lessParentheses)))));
            // The boolean overload trims ToString(), which writes some text differently but must read back the same.
            Assert.True(JsonElement.DeepEquals(expected, JsonSerializer.SerializeToElement(Tree(new Parser().Parse(parsed.Format(lessParentheses: true))))));
        }
    }
    [Fact(Timeout = 30000)]
    public static void SharedNestedFormat()
    {
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Protocol", "nested-fixtures.json")));
        Assert.NotEmpty(document.RootElement.EnumerateArray());
        foreach (var fixture in document.RootElement.EnumerateArray())
        {
            TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
            var parsed = new Parser().Parse(fixture.GetProperty("input").GetString()!);
            Assert.Equal(fixture.GetProperty("nested").GetString(), parsed.FormatNested());
        }
    }

    [Fact(Timeout = 30000)]
    public static void AnonymousThresholdRoundTrip()
    {
        foreach (var input in new[] { "a b c", "((b c))", "(a (b c))" })
        {
            var links = new Parser().Parse(input);
            foreach (var options in new[] {
                new FormatOptions { LessParentheses = true, MaxInlineRefs = 0, PreferInline = false },
                new FormatOptions { LessParentheses = true, IndentLongLines = true, MaxLineLength = 1, PreferInline = false }
            })
            {
                var parsed = new Parser().Parse(links.Format(options));
                Assert.True(JsonElement.DeepEquals(JsonSerializer.SerializeToElement(Tree(links)), JsonSerializer.SerializeToElement(Tree(parsed))));
            }
        }
    }
}
