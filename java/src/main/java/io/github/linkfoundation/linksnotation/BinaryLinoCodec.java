package io.github.linkfoundation.linksnotation;

import java.io.*;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/** Binary links notation v1. Packet types are independent of the document mapping. */
public final class BinaryLinoCodec {
  private static final BigInteger U64 = BigInteger.ONE.shiftLeft(64).subtract(BigInteger.ONE);
  private static final BigInteger ZERO = BigInteger.ZERO;
  private static final BigInteger SIX = BigInteger.valueOf(6);
  private static final int[] WIDTHS = {1, 2, 4, 8};

  private static void require(boolean ok, String message) {
    if (!ok) throw new IllegalArgumentException("binary notation: " + message);
  }

  private static BigInteger u64(BigInteger n) {
    require(n != null && n.signum() >= 0 && n.compareTo(U64) <= 0, "uint64 overflow");
    return n;
  }

  private static BigInteger bi(long n) {
    return BigInteger.valueOf(n);
  }

  /** A reference; BigInteger preserves the full unsigned 64-bit wire range. */
  public record Reference(BigInteger value, boolean external) {
    public Reference {
      u64(value);
    }

    public Reference(long value) {
      this(bi(value), false);
    }

    public static Reference internal(BigInteger n) {
      return new Reference(n, false);
    }

    public static Reference external(BigInteger n) {
      return new Reference(n, true);
    }
  }

  /** Inclusive arity range. Null maximum means unbounded. */
  public record ArityRange(BigInteger min, BigInteger max) {
    public ArityRange {
      require(
          u64(min).signum() > 0
              && min.compareTo(U64.shiftRight(4)) <= 0
              && (max == null || u64(max).compareTo(min) >= 0),
          "invalid arity");
    }

    public ArityRange(long min, Long max) {
      this(bi(min), max == null ? null : bi(max));
    }

    public ArityRange() {
      this(2, 2L);
    }

    public boolean contains(long n) {
      return contains(bi(n));
    }

    public boolean contains(BigInteger n) {
      return n.compareTo(min) >= 0 && (max == null || n.compareTo(max) <= 0);
    }

    public boolean fixed() {
      return min.equals(max);
    }

    public static ArityRange parse(String text) {
      require(text.matches("[0-9]+(?:\\.\\.[0-9]*)?"), "invalid arity");
      String[] p = text.split("\\.\\.", -1);
      return new ArityRange(
          new BigInteger(p[0]), p[p.length - 1].isEmpty() ? null : new BigInteger(p[p.length - 1]));
    }
  }

  /** Work budgets apply on both byte/model input and encoding. */
  public record Limits(
      long maxLinks, long maxReferences, long maxNodes, long maxStringBytes, int maxDepth) {
    public Limits {
      require(
          maxLinks >= 0
              && maxReferences >= 0
              && maxNodes >= 0
              && maxStringBytes >= 0
              && maxDepth >= 0,
          "negative limit");
    }

    public Limits() {
      this(1 << 22, 1 << 24, 1 << 22, 64 << 20, 64);
    }

    public static Limits unlimited() {
      return new Limits(
          Long.MAX_VALUE, Long.MAX_VALUE, Long.MAX_VALUE, Long.MAX_VALUE, Integer.MAX_VALUE);
    }
  }

  /** Independent encoder features. */
  public record Options(boolean externalReferences, ArityRange arity, boolean packedWidths) {
    public Options {
      Objects.requireNonNull(arity);
    }

    public Options() {
      this(false, new ArityRange(), false);
    }

    public static Options ofPacket(Packet p) {
      int min = 2, max = 2;
      var widths = new HashSet<Integer>();
      for (var s : p.sections) {
        widths.add(s.width);
        for (var l : s.links) {
          min = Math.min(min, l.size());
          max = Math.max(max, l.size());
        }
      }
      return new Options(p.externalReferences, new ArityRange(min, (long) max), widths.size() > 1);
    }
  }

  /** One consecutive run of raw links. */
  public record Section(BigInteger gap, ArityRange arity, int width, List<List<Reference>> links) {
    public Section {
      u64(gap);
      Objects.requireNonNull(arity);
      links = links.stream().map(List::copyOf).toList();
    }
  }

  public record AddressedLink(BigInteger address, List<Reference> references) {
    public AddressedLink {
      u64(address);
      references = List.copyOf(references);
    }
  }

  private static int widthCode(int width) {
    for (int i = 0; i < 4; i++) if (WIDTHS[i] == width) return i;
    throw new IllegalArgumentException("invalid width");
  }

  private static int referenceWidth(Reference r, boolean external) {
    require(!r.external || external, "external references disabled");
    for (int width : WIDTHS)
      if (r.value.bitLength() <= width * 8 - (external ? 1 : 0)) return width;
    throw new IllegalArgumentException("reference exceeds capacity");
  }

  private static void leb(ByteArrayOutputStream out, BigInteger n) {
    u64(n);
    while (n.compareTo(bi(128)) >= 0) {
      out.write(n.intValue() & 127 | 128);
      n = n.shiftRight(7);
    }
    out.write(n.intValue());
  }

  private static int readByte(InputStream input) throws IOException {
    int b = input.read();
    require(b >= 0, "unexpected end of packet");
    return b;
  }

  private static BigInteger readLeb(InputStream input) throws IOException {
    BigInteger value = ZERO;
    for (int shift = 0; shift < 64; shift += 7) {
      int b = readByte(input);
      require(shift != 63 || (b & 127) <= 1, "LEB128 overflow");
      value = value.or(bi(b & 127).shiftLeft(shift));
      if (b < 128) return value;
    }
    throw new IllegalArgumentException("LEB128 overflow");
  }

  private static BigInteger readRaw(InputStream input, int width) throws IOException {
    BigInteger n = ZERO;
    for (int i = 0; i < width; i++) n = n.or(bi(readByte(input)).shiftLeft(i * 8));
    return n;
  }

  /** Raw packet; it may contain holes, self-references and arbitrary positive arities. */
  public record Packet(boolean externalReferences, List<Section> sections) {
    public Packet {
      sections = List.copyOf(sections);
    }

    public List<AddressedLink> links() {
      var result = new ArrayList<AddressedLink>();
      BigInteger address = BigInteger.ONE;
      for (var s : sections) {
        address = u64(address.add(s.gap));
        for (var link : s.links) {
          result.add(new AddressedLink(address, link));
          address = u64(address.add(BigInteger.ONE));
        }
      }
      return result;
    }

    public Packet validate(Limits limits) {
      require(sections.size() <= limits.maxLinks, "too many sections");
      BigInteger address = BigInteger.ONE;
      long links = 0, refs = 0;
      for (var s : sections) {
        widthCode(s.width);
        address = u64(address.add(s.gap).add(bi(s.links.size())));
        links += s.links.size();
        require(links <= limits.maxLinks, "too many links");
        for (var link : s.links) {
          require(s.arity.contains(link.size()), "link outside arity");
          require(link.size() <= limits.maxReferences - refs, "too many references");
          refs += link.size();
          for (var r : link)
            require(referenceWidth(r, externalReferences) <= s.width, "reference outside width");
        }
      }
      return this;
    }

    public byte[] toBytes() {
      return toBytes(new Limits());
    }

    public byte[] toBytes(Limits limits) {
      validate(limits);
      var out = new ByteArrayOutputStream();
      int header = 0x10 | (externalReferences ? 1 : 0);
      Section s = sections.isEmpty() ? null : sections.getFirst();
      boolean compact =
          s == null
              || (sections.size() == 1
                  && s.gap.equals(bi(5))
                  && s.arity.equals(new ArityRange())
                  && !s.links.isEmpty());
      if (compact) {
        out.write(header | widthCode(s == null ? 1 : s.width) << 2);
        leb(out, bi(s == null ? 0 : s.links.size()));
      } else {
        out.write(header | 2);
        leb(out, bi(sections.size()));
        for (var section : sections) {
          leb(
              out,
              section
                  .arity
                  .min
                  .shiftLeft(4)
                  .or(
                      bi(
                          widthCode(section.width)
                              | (section.gap.signum() > 0 ? 4 : 0)
                              | (section.arity.fixed() ? 0 : 8))));
          if (section.gap.signum() > 0) leb(out, section.gap);
          if (!section.arity.fixed())
            leb(
                out,
                section.arity.max == null ? ZERO : section.arity.max.subtract(section.arity.min));
          leb(out, bi(section.links.size()));
        }
      }
      for (var section : sections)
        for (var link : section.links) {
          if (!section.arity.fixed()) leb(out, bi(link.size()).subtract(section.arity.min));
          for (var r : link) {
            BigInteger raw = r.value;
            if (r.external)
              raw =
                  r.value.signum() == 0
                      ? BigInteger.ONE.shiftLeft(section.width * 8 - 1)
                      : BigInteger.ONE.shiftLeft(section.width * 8).subtract(r.value);
            for (int i = 0; i < section.width; i++)
              out.write(raw.shiftRight(i * 8).intValue() & 255);
          }
        }
      return out.toByteArray();
    }

    public void writeTo(OutputStream output, Limits limits) throws IOException {
      output.write(toBytes(limits));
    }

    public static Packet fromBytes(byte[] bytes, Limits limits) {
      var input = new ByteArrayInputStream(bytes);
      try {
        Packet packet = readFrom(input, limits);
        require(packet != null, "empty input");
        require(input.available() == 0, "trailing bytes");
        return packet;
      } catch (IOException e) {
        throw new IllegalArgumentException("packet read failed", e);
      }
    }

    /** Returns null only at a clean EOF; reads no bytes from the following packet. */
    public static Packet readFrom(InputStream input, Limits limits) throws IOException {
      int header = input.read();
      if (header < 0) return null;
      require((header & 0xf0) == 0x10, "unsupported binary version");
      var sections = new ArrayList<Section>();
      var counts = new ArrayList<Long>();
      if ((header & 2) != 0) {
        require((header & 12) == 0, "explicit header width bits set");
        BigInteger n = readLeb(input);
        require(n.compareTo(bi(limits.maxLinks)) <= 0, "too many sections");
        BigInteger address = BigInteger.ONE, total = ZERO;
        for (long i = 0; i < n.longValueExact(); i++) {
          BigInteger shape = readLeb(input),
              gap = shape.testBit(2) ? readLeb(input) : ZERO,
              min = shape.shiftRight(4);
          BigInteger extra = shape.testBit(3) ? readLeb(input) : null;
          var arity =
              new ArityRange(
                  min, extra == null ? min : extra.signum() == 0 ? null : u64(min.add(extra)));
          BigInteger count = readLeb(input);
          address = u64(address.add(gap).add(count));
          total = total.add(count);
          require(total.compareTo(bi(limits.maxLinks)) <= 0, "too many links");
          sections.add(new Section(gap, arity, WIDTHS[shape.intValue() & 3], List.of()));
          counts.add(count.longValueExact());
        }
      } else {
        BigInteger count = readLeb(input);
        u64(SIX.add(count));
        require(count.compareTo(bi(limits.maxLinks)) <= 0, "too many links");
        if (count.signum() > 0) {
          sections.add(new Section(bi(5), new ArityRange(), WIDTHS[header >> 2 & 3], List.of()));
          counts.add(count.longValueExact());
        }
      }
      long refs = 0;
      var result = new ArrayList<Section>();
      for (int i = 0; i < sections.size(); i++) {
        var s = sections.get(i);
        var links = new ArrayList<List<Reference>>();
        for (long j = 0; j < counts.get(i); j++) {
          BigInteger length = u64(s.arity.min.add(s.arity.fixed() ? ZERO : readLeb(input)));
          require(s.arity.contains(length), "link outside arity");
          require(length.compareTo(bi(limits.maxReferences - refs)) <= 0, "too many references");
          refs += length.longValueExact();
          var link = new ArrayList<Reference>();
          BigInteger top = BigInteger.ONE.shiftLeft(s.width * 8 - 1);
          for (long k = 0; k < length.longValueExact(); k++) {
            BigInteger raw = readRaw(input, s.width);
            boolean external = (header & 1) != 0 && raw.compareTo(top) >= 0;
            link.add(
                new Reference(
                    external ? (raw.equals(top) ? ZERO : top.shiftLeft(1).subtract(raw)) : raw,
                    external));
          }
          links.add(link);
        }
        result.add(new Section(s.gap, s.arity, s.width, links));
      }
      return new Packet((header & 1) != 0, result);
    }

    public static List<AddressedLink> parseLinks(String text) {
      var links = new ArrayList<AddressedLink>();
      for (String entry : text.split(";")) {
        if (entry.isBlank()) continue;
        String[] parts = entry.split(":", -1);
        require(parts.length == 2, "invalid raw links");
        var refs = new ArrayList<Reference>();
        for (String r : parts[1].trim().split("\\s+")) {
          if (r.isEmpty()) continue;
          refs.add(
              new Reference(
                  new BigInteger(r.startsWith("#") ? r.substring(1) : r), r.startsWith("#")));
        }
        links.add(new AddressedLink(new BigInteger(parts[0].trim()), refs));
      }
      return links;
    }

    public static Packet pack(boolean external, List<AddressedLink> links, boolean packed) {
      var planner = new Planner(external, links);
      Packet uniform = planner.packet(planner.plan(false));
      if (!packed) return uniform;
      Packet candidate = planner.packet(planner.plan(true));
      return candidate.toBytes(Limits.unlimited()).length
              < uniform.toBytes(Limits.unlimited()).length
          ? candidate
          : uniform;
    }
  }

  private record Run(int count, int width) {}

  private static final class Planner {
    final boolean external;
    final List<AddressedLink> links;
    final int[] needs;

    Planner(boolean external, List<AddressedLink> links) {
      this.external = external;
      this.links = List.copyOf(links);
      needs = new int[links.size()];
      BigInteger previous = ZERO;
      for (int i = 0; i < links.size(); i++) {
        var link = links.get(i);
        require(
            link.address.compareTo(previous) > 0
                && link.address.compareTo(U64) < 0
                && !link.references.isEmpty(),
            "invalid address order or empty link");
        previous = link.address;
        needs[i] = 1;
        for (var r : link.references) needs[i] = Math.max(needs[i], referenceWidth(r, external));
      }
    }

    int cheapest(long[] costs) {
      int best = 0;
      for (int state = 1; state < 8; state++) if (costs[state] < costs[best]) best = state;
      return best;
    }

    List<Run> plan(boolean packed) {
      if (links.isEmpty()) return List.of();
      int widest = Arrays.stream(needs).max().orElse(1);
      long infinity = Long.MAX_VALUE / 4;
      long[] costs = new long[8];
      Arrays.fill(costs, infinity);
      int[] opens = new int[links.size()], bests = new int[links.size()];
      for (int i = 0; i < links.size(); i++) {
        int best = cheapest(costs);
        bests[i] = best;
        long before = i == 0 ? 0 : costs[best];
        long[] next = new long[8];
        Arrays.fill(next, infinity);
        for (int state = 0; state < 8; state++) {
          int width = WIDTHS[state / 2], variable = state % 2;
          if ((!packed && width != widest) || width < needs[i]) continue;
          long opening = before + 2 + variable;
          boolean continues =
              i > 0
                  && links.get(i - 1).address.add(BigInteger.ONE).equals(links.get(i).address)
                  && (variable == 1
                      || links.get(i - 1).references.size() == links.get(i).references.size());
          long continuing = continues ? costs[state] : infinity,
              body = (long) links.get(i).references.size() * width + variable;
          if (continuing <= opening) next[state] = continuing + body;
          else {
            next[state] = opening + body;
            opens[i] |= 1 << state;
          }
        }
        costs = next;
      }
      var result = new ArrayList<Run>();
      int end = links.size(), state = cheapest(costs);
      for (int i = links.size() - 1; i >= 0; i--)
        if ((opens[i] & (1 << state)) != 0) {
          result.add(new Run(end - i, WIDTHS[state / 2]));
          end = i;
          state = bests[i];
        }
      Collections.reverse(result);
      return result;
    }

    Packet packet(List<Run> plan) {
      var sections = new ArrayList<Section>();
      int index = 0;
      BigInteger address = BigInteger.ONE;
      for (var run : plan) {
        var members = links.subList(index, index + run.count);
        int min = Integer.MAX_VALUE, max = 0;
        var refs = new ArrayList<List<Reference>>();
        for (var l : members) {
          min = Math.min(min, l.references.size());
          max = Math.max(max, l.references.size());
          refs.add(l.references);
        }
        BigInteger start = members.getFirst().address;
        sections.add(
            new Section(start.subtract(address), new ArityRange(min, (long) max), run.width, refs));
        index += run.count;
        address = start.add(bi(run.count));
      }
      return new Packet(external, sections);
    }
  }

  private record Node(char kind, BigInteger value) {
    Node(char kind, long value) {
      this(kind, bi(value));
    }
  }

  private static final class Encoder {
    final Options options;
    final List<List<Node>> doublets = new ArrayList<>(), tuples = new ArrayList<>();
    final Map<List<Node>, Node> created = new HashMap<>();
    final List<Node> powers = new ArrayList<>(List.of(new Node('i', 1)));

    Encoder(Options options) {
      this.options = options;
    }

    Node link(List<Node> items) {
      var key = List.copyOf(items);
      var found = created.get(key);
      if (found != null) return found;
      boolean doublet = items.size() == 2 && items.stream().noneMatch(n -> n.kind == 't');
      var target = doublet ? doublets : tuples;
      Node n = new Node(doublet ? 'd' : 't', target.size());
      target.add(key);
      created.put(key, n);
      return n;
    }

    Node chain(List<Node> items) {
      Node tail = new Node('i', 0);
      for (int i = items.size() - 1; i >= 0; i--) tail = link(List.of(items.get(i), tail));
      return tail;
    }

    Node typed(int marker, List<Node> elements) {
      var items = new ArrayList<Node>();
      items.add(new Node('i', marker));
      items.addAll(elements);
      return items.size() != 2 && options.arity.contains(items.size())
          ? link(items)
          : link(List.of(items.getFirst(), chain(elements)));
    }

    Node list(List<Node> elements) {
      if (elements.isEmpty()) return new Node('i', 0);
      return elements.size() == 2 || options.arity.contains(elements.size())
          ? link(elements)
          : typed(4, elements);
    }

    Node unary(BigInteger value) {
      var elements = new ArrayList<Node>();
      for (int bit = 63; bit >= 0; bit--)
        if (value.testBit(bit)) {
          while (powers.size() <= bit) {
            Node previous = powers.getLast();
            powers.add(link(List.of(previous, previous)));
          }
          elements.add(powers.get(bit));
        }
      if (elements.isEmpty()) return new Node('i', 0);
      Node sum = elements.getLast();
      for (int i = elements.size() - 2; i >= 0; i--) sum = link(List.of(elements.get(i), sum));
      return sum;
    }

    Node scalar(BigInteger value) {
      return options.externalReferences && value.bitLength() <= 63
          ? new Node('e', value)
          : unary(value);
    }

    Node reference(String text) {
      if (text.length() <= 20 && text.matches("0|[1-9][0-9]*")) {
        BigInteger v = new BigInteger(text);
        if (v.compareTo(U64) <= 0)
          return options.externalReferences && v.bitLength() <= 63
              ? new Node('e', v)
              : link(List.of(new Node('i', 2), unary(v)));
      }
      var points = new ArrayList<Node>();
      text.codePoints().forEach(p -> points.add(scalar(bi(p))));
      return typed(3, points);
    }

    Node encode(Link n) {
      if (n.getId() != null && n.getValues().isEmpty()) return reference(n.getId());
      var elements = new ArrayList<Node>();
      if (n.getId() != null) elements.add(reference(n.getId()));
      for (var v : n.getValues()) elements.add(encode(v));
      return n.getId() != null ? typed(5, elements) : list(elements);
    }

    Packet finish() {
      var links = new ArrayList<AddressedLink>();
      var all = new ArrayList<>(doublets);
      all.addAll(tuples);
      for (var items : all) {
        var refs = new ArrayList<Reference>();
        for (var n : items) {
          BigInteger v = n.value;
          if (n.kind == 'd' || n.kind == 't')
            v = SIX.add(v).add(n.kind == 't' ? bi(doublets.size()) : ZERO);
          refs.add(new Reference(v, n.kind == 'e'));
        }
        links.add(new AddressedLink(SIX.add(bi(links.size())), refs));
      }
      return Packet.pack(options.externalReferences, links, options.packedWidths);
    }
  }

  private static final class Decoder {
    final Limits limits;
    final List<List<Reference>> links = new ArrayList<>();
    final List<BigInteger> unary = new ArrayList<>();
    long nodes, strings;

    Decoder(Packet p, Limits limits) {
      p.validate(limits);
      this.limits = limits;
      nodes = limits.maxNodes;
      strings = limits.maxStringBytes;
      for (var l : p.links()) {
        require(
            l.address.equals(SIX.add(bi(links.size()))),
            "document links must be contiguous from 6");
        for (var r : l.references)
          require(
              r.external || r.value.compareTo(l.address) < 0,
              "document contains forward reference");
        BigInteger value = null;
        if (l.references.size() == 2) {
          BigInteger a = unaryValue(l.references.get(0)), b = unaryValue(l.references.get(1));
          if (a != null && b != null && a.add(b).compareTo(U64) <= 0) value = a.add(b);
        }
        unary.add(value);
        links.add(l.references);
      }
    }

    BigInteger unaryValue(Reference r) {
      if (r.external) return null;
      if (r.value.compareTo(BigInteger.ONE) <= 0) return r.value;
      return r.value.compareTo(SIX) >= 0 ? unary.get(r.value.subtract(SIX).intValueExact()) : null;
    }

    List<Reference> chain(Reference tail) {
      var result = new ArrayList<Reference>();
      while (tail.external || tail.value.signum() != 0) {
        require(!tail.external && tail.value.compareTo(SIX) >= 0, "broken chain");
        var items = links.get(tail.value.subtract(SIX).intValueExact());
        require(items.size() == 2 && result.size() < limits.maxNodes, "broken or excessive chain");
        result.add(items.get(0));
        tail = items.get(1);
      }
      return result;
    }

    BigInteger number(Reference r) {
      BigInteger n = r.external ? r.value : unaryValue(r);
      require(n != null, "expected unary number");
      return n;
    }

    Link text(String text) {
      int bytes = text.getBytes(StandardCharsets.UTF_8).length;
      require(bytes <= strings, "string budget exceeded");
      strings -= bytes;
      return new Link(text);
    }

    Link decode(Reference r, int depth) {
      require(depth < limits.maxDepth && nodes > 0, "node or depth budget exceeded");
      nodes--;
      if (r.external) return text(r.value.toString());
      if (r.value.signum() == 0) return new Link();
      require(r.value.compareTo(SIX) >= 0, "standalone marker");
      var items = links.get(r.value.subtract(SIX).intValueExact());
      var elements = items;
      Reference first = items.getFirst();
      if (!first.external && first.value.signum() > 0 && first.value.compareTo(bi(5)) <= 0) {
        int marker = first.value.intValue();
        elements =
            items.size() != 2 || marker == 2 ? items.subList(1, items.size()) : chain(items.get(1));
        if (marker == 2) {
          require(elements.size() == 1, "number needs one value");
          return text(number(elements.getFirst()).toString());
        }
        if (marker == 3) {
          var text = new StringBuilder();
          for (var e : elements) {
            BigInteger p = number(e);
            require(
                p.compareTo(bi(0x10ffff)) <= 0
                    && !(p.compareTo(bi(0xd800)) >= 0 && p.compareTo(bi(0xdfff)) <= 0),
                "invalid Unicode scalar");
            text.appendCodePoint(p.intValue());
          }
          return text(text.toString());
        }
        if (marker == 5) {
          require(!elements.isEmpty(), "identified needs id");
          var id = decode(elements.getFirst(), depth);
          require(id.getId() != null && id.getValues().isEmpty(), "id must be reference");
          var values = new ArrayList<Link>();
          for (var e : elements.subList(1, elements.size())) values.add(decode(e, depth + 1));
          return new Link(id.getId(), values);
        }
        require(marker == 4, "invalid typed marker");
      }
      var values = new ArrayList<Link>();
      for (var e : elements) values.add(decode(e, depth + 1));
      return new Link(null, values);
    }

    List<Link> document() {
      if (links.isEmpty()) return List.of();
      var root = links.getLast();
      var elements = root;
      var first = root.getFirst();
      if (root.size() == 2 && !first.external && first.value.equals(bi(4)))
        elements = chain(root.get(1));
      else
        require(
            first.external || first.value.signum() == 0 || first.value.compareTo(bi(5)) > 0,
            "root must be list");
      var result = new ArrayList<Link>();
      for (var e : elements) result.add(decode(e, 0));
      return result;
    }
  }

  private final Options options;
  private final Limits limits;

  public BinaryLinoCodec() {
    this(new Options(), new Limits());
  }

  public BinaryLinoCodec(Options options, Limits limits) {
    this.options = Objects.requireNonNull(options);
    this.limits = Objects.requireNonNull(limits);
  }

  public Options options() {
    return options;
  }

  public Limits limits() {
    return limits;
  }

  private static void validString(String text) {
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      if (Character.isHighSurrogate(c)) {
        require(
            i + 1 < text.length() && Character.isLowSurrogate(text.charAt(++i)),
            "invalid surrogate");
      } else require(!Character.isLowSurrogate(c), "invalid surrogate");
    }
  }

  private record Pending(Link node, int depth) {}

  public Packet encodePacket(List<Link> document) {
    require(options.arity.contains(2), "arity must contain 2");
    var pending = new ArrayDeque<Pending>();
    for (var n : document) pending.push(new Pending(n, 0));
    long nodes = 0, strings = 0;
    while (!pending.isEmpty()) {
      var p = pending.pop();
      require(p.node != null && p.depth < limits.maxDepth, "invalid model or excessive depth");
      nodes++;
      if (p.node.getId() != null) {
        validString(p.node.getId());
        strings += p.node.getId().getBytes(StandardCharsets.UTF_8).length;
        if (!p.node.getValues().isEmpty()) nodes++;
      }
      require(
          nodes <= limits.maxNodes && strings <= limits.maxStringBytes, "model budget exceeded");
      for (var v : p.node.getValues()) pending.push(new Pending(v, p.depth + 1));
    }
    var e = new Encoder(options);
    if (!document.isEmpty()) {
      var elements = new ArrayList<Node>();
      for (var n : document) elements.add(e.encode(n));
      e.list(elements);
    }
    return e.finish().validate(limits);
  }

  public byte[] encode(List<Link> document) {
    return encodePacket(document).toBytes(limits);
  }

  public List<Link> decodePacket(Packet packet) {
    return new Decoder(packet, limits).document();
  }

  public List<Link> decode(byte[] bytes) {
    return decodePacket(Packet.fromBytes(bytes, limits));
  }

  private static Link canonical(Link n) {
    if (n.getId() == null && n.getValues().size() == 1) {
      var v = n.getValues().getFirst();
      if (v.getId() != null && v.getValues().isEmpty()) return v;
    }
    return new Link(n.getId(), n.getValues().stream().map(BinaryLinoCodec::canonical).toList());
  }

  public List<Link> parseDocument(String text) throws ParseException {
    return parseDocument(text, new Parser());
  }

  public List<Link> parseDocument(String text, Parser parser) throws ParseException {
    return parser.parse(text).stream().map(BinaryLinoCodec::canonical).toList();
  }

  public static String formatReference(String text) {
    if (!text.isEmpty()
        && !text.startsWith("#")
        && text.codePoints()
            .noneMatch(
                c ->
                    c == 0x85
                        || (Character.isWhitespace(c) && (c < 0x1c || c > 0x1f))
                        || Character.isSpaceChar(c)
                        || "():\"'`".indexOf(c) >= 0)) return text;
    char chosen = 0;
    int count = Integer.MAX_VALUE;
    for (char quote : new char[] {'\'', '"', '`'}) {
      if (!text.isEmpty() && text.charAt(0) == quote) continue;
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

  private static String formatLink(Link n, boolean top) {
    if (n.getId() != null && n.getValues().isEmpty()) return formatReference(n.getId());
    String values =
        n.getValues().stream().map(v -> formatLink(v, false)).collect(Collectors.joining(" "));
    if (n.getId() != null) return "(" + formatReference(n.getId()) + ": " + values + ")";
    if (n.getValues().size() == 1
        && n.getValues().getFirst().getId() != null
        && n.getValues().getFirst().getValues().isEmpty()) return "((" + values + "))";
    return top && n.getValues().size() >= 2 ? values : "(" + values + ")";
  }

  public static String formatDocument(List<Link> document) {
    return document.stream().map(n -> formatLink(n, true)).collect(Collectors.joining("\n"));
  }

  public byte[] encodeText(String text) throws ParseException {
    return encode(parseDocument(text));
  }

  public String decodeText(byte[] bytes) {
    return formatDocument(decode(bytes));
  }
}
