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
}
