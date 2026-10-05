using Link.Foundation.Links.Notation.Binary;

var corpus = new[]
{
    "",
    "() ((1 1))",
    "(child: father mother)",
    "('😀' 007 18446744073709551615)",
    "'#tag'\n((a))",
    "(70000 1)",
};
foreach (var text in corpus)
{
    var document = LinoFormat.ParseDocument(text);
    foreach (var externalReferences in new[] { false, true })
    {
        foreach (var arity in new[] { ArityRange.Doublets, ArityRange.Between(2, 3), ArityRange.AtLeast(1) })
        {
            foreach (var packedWidths in new[] { false, true })
            {
                var codec = new BinaryLinoCodec(new BinaryLinoOptions
                {
                    ExternalReferences = externalReferences,
                    Arity = arity,
                    PackedWidths = packedWidths,
                });
                var bytes = codec.Encode(document);
                var decoded = codec.Decode(bytes);
                if (!document.SequenceEqual(decoded))
                {
                    throw new InvalidOperationException("Document changed in binary round trip");
                }
                var hex = string.Join(" ", bytes.Select(value => value.ToString("x2")));
                Console.WriteLine($"{hex}\t{LinoFormat.FormatDocument(decoded).Replace("\n", "\\n")}");
            }
        }
    }
}
