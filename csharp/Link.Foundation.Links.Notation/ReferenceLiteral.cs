using System;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace Link.Foundation.Links.Notation;

/// <summary>Version 1 lossless Unicode reference literals.</summary>
public static class ReferenceLiteral
{
    private static readonly UTF8Encoding Utf8 = new(false, true);
    private static readonly Regex Literal = new("\\A~([0-9]+)\\{([0-9a-fA-F]*)\\}\\z");

    /// <summary>Encodes exact Unicode as a version 1 UTF-8 hexadecimal literal.</summary>
    public static string Encode(string text) => $"~1{{{Convert.ToHexString(Utf8.GetBytes(text)).ToLowerInvariant()}}}";

    /// <summary>Decodes a complete literal; malformed UTF-8 and versions are refused.</summary>
    public static string Decode(string literal)
    {
        var match = Literal.Match(literal);
        if (!match.Success || match.Groups[1].Value != "1" || match.Groups[2].Length % 2 != 0)
        {
            throw new FormatException("Invalid or unsupported reference literal (expected ~1{UTF-8 hex})");
        }
        try { return Utf8.GetString(Convert.FromHexString(match.Groups[2].Value)); }
        catch (DecoderFallbackException error) { throw new FormatException("Reference literal must contain valid UTF-8", error); }
    }

    internal static bool HasPrefix(string subject, int start)
    {
        if (start >= subject.Length || subject[start] != '~') return false;
        var position = start + 1;
        while (position < subject.Length && subject[position] is >= '0' and <= '9') position++;
        return position > start + 1 && position < subject.Length && subject[position] == '{';
    }

    internal static bool TryRead(string subject, int start, out string value, out int length)
    {
        value = "";
        length = 0;
        if (!HasPrefix(subject, start)) return false;
        var opening = subject.IndexOf('{', start);
        var closing = subject.IndexOf('}', opening + 1);
        if (closing < 0) throw new FormatException("Unclosed reference literal");
        length = closing + 1 - start;
        value = Decode(subject.Substring(start, length));
        return true;
    }

    internal static string Format(string text)
    {
        Utf8.GetByteCount(text); // Refuse unpaired surrogates before formatting.
        if (text.Length == 0 || text.Any(c => c < 32 || c == 127)) return Encode(text);
        var needsQuotes = HasPrefix(text, 0) || text.StartsWith('#') || text.Any(c => char.IsWhiteSpace(c) || c is '\ufeff' or '(' or ')' or ':' or '\'' or '"' or '`');
        if (!needsQuotes) return text;
        var (quote, count) = new[] { '\'', '"', '`' }
            .Where(quote => text[0] != quote)
            .Select(quote => (Quote: quote, Count: (LongestRun(text, quote) + 1) | 1))
            .MinBy(candidate => candidate.Count);
        var delimiter = new string(quote, count);
        return $"{delimiter}{text}{delimiter}";
    }

    private static int LongestRun(string text, char quote)
    {
        var (longest, current) = (0, 0);
        foreach (var character in text)
        {
            current = character == quote ? current + 1 : 0;
            longest = Math.Max(longest, current);
        }
        return longest;
    }
}
