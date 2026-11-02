using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests;

/// <summary>
/// Runs the syntax fixtures every Links Notation implementation shares (issue #364): the
/// raw text and delimiter recorded for each parsed reference, and the concrete syntax
/// tree, which must give back every shared input exactly.
/// </summary>
public static class SharedSyntaxParityTests
{
    private static JsonDocument Fixtures(string name) =>
        JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Protocol", name)));

    private static object[] Tree(IEnumerable<Link<string>> links) => links
        .Select(link => (object)new
        {
            id = link.Id,
            raw = link.RawId,
            quote = link.Quote?.ToString(),
            values = Tree(link.Values ?? Array.Empty<Link<string>>()),
        }).ToArray();

    private static void AssertTree(JsonElement expected, IEnumerable<Link<string>> links, string id) =>
        Assert.True(
            JsonElement.DeepEquals(expected, JsonSerializer.SerializeToElement(Tree(links))),
            $"{id}: {JsonSerializer.Serialize(Tree(links))}");

    [Fact(Timeout = 30000)]
    public static void SharedSyntaxParity()
    {
        using var document = Fixtures("syntax-fixtures.json");
        Assert.NotEmpty(document.RootElement.EnumerateArray());
        foreach (var fixture in document.RootElement.EnumerateArray())
        {
            TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
            var id = fixture.GetProperty("id").GetString()!;
            var input = fixture.GetProperty("input").GetString()!;
            var expected = fixture.GetProperty("links");
            var parser = new Parser();
            AssertTree(expected, parser.Parse(input), id);
            var cst = parser.ParseCst(input);
            Assert.Equal(fixture.GetProperty("cst").GetString(), cst.ToSExpression());
            Assert.Equal(input, cst.ToString());
            var stream = new StreamParser();
            foreach (var character in input) stream.Write(character.ToString());
            AssertTree(expected, stream.Finish(), id);
        }
    }

    [Fact(Timeout = 30000)]
    public static void EverySharedInputIsRecoveredFromItsConcreteSyntaxTree()
    {
        using var text = Fixtures("text-fixtures.json");
        using var syntax = Fixtures("syntax-fixtures.json");
        var fixtures = text.RootElement.EnumerateArray().Concat(syntax.RootElement.EnumerateArray()).ToList();
        Assert.NotEmpty(fixtures);
        foreach (var fixture in fixtures)
        {
            TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
            var input = fixture.GetProperty("input").GetString()!;
            var cst = new Parser().ParseCst(input);
            Assert.Equal(input, cst.ToString());
            Assert.Equal(input, string.Concat(cst.Tokens().Select(token => token.Text)));
        }
    }
}
