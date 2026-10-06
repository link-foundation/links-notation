// Binary links notation v1: packets and the lossless marker-point mapping.
// Wire format and conformance vectors live in docs/protocol.
package lino

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

// Reference is an internal address or a Hybrid external unsigned value.
type Reference struct {
	Value    uint64
	External bool
}

// PacketLink gives a raw link its implicit address.
type PacketLink struct {
	Address    uint64
	References []Reference
}

// ArityRange is inclusive. A nil maximum means unbounded; the zero value means doublets.
type ArityRange struct {
	Min uint64
	Max *uint64
}

func ExactArity(n uint64) ArityRange { return ArityRange{n, &n} }
func (a ArityRange) normalized() ArityRange {
	if a.Min == 0 && a.Max == nil {
		return ExactArity(2)
	}
	return a
}
func (a ArityRange) contains(n uint64) bool {
	a = a.normalized()
	return n >= a.Min && (a.Max == nil || n <= *a.Max)
}
func (a ArityRange) fixed() bool { a = a.normalized(); return a.Max != nil && *a.Max == a.Min }
func (a ArityRange) validate() {
	a = a.normalized()
	demand(a.Min > 0 && a.Min <= math.MaxUint64>>4 && (a.Max == nil || *a.Max >= a.Min), "invalid arity")
}
func ParseArityRange(text string) (result ArityRange, err error) {
	defer binaryRecover(&err)
	parts := strings.Split(text, "..")
	demand(len(parts) <= 2, "invalid arity")
	parse := func(s string) uint64 {
		demand(s != "" && strings.IndexFunc(s, func(r rune) bool { return r < '0' || r > '9' }) < 0, "invalid arity")
		v, e := strconv.ParseUint(s, 10, 64)
		if e != nil {
			failBinary(e)
		}
		return v
	}
	result = ExactArity(parse(parts[0]))
	if len(parts) == 2 {
		result.Max = nil
		if parts[1] != "" {
			v := parse(parts[1])
			result.Max = &v
		}
	}
	// A textual zero must be rejected rather than interpreted as the zero-value default.
	demand(result.Min > 0, "invalid arity")
	result.validate()
	return
}

// DecodeLimits bounds both decoding and encoding. Increase only for trusted models.
type DecodeLimits struct {
	MaxLinks, MaxReferences, MaxNodes, MaxStringBytes uint64
	MaxDepth                                          uint64
}

func DefaultDecodeLimits() DecodeLimits { return DecodeLimits{1 << 22, 1 << 24, 1 << 22, 64 << 20, 64} }
func UnlimitedDecodeLimits() DecodeLimits {
	return DecodeLimits{math.MaxUint64, math.MaxUint64, math.MaxUint64, math.MaxUint64, math.MaxUint64}
}

// BinaryLinoOptions selects independent encoding features. Its zero value is v1 doublets.
type BinaryLinoOptions struct {
	ExternalReferences bool
	Arity              ArityRange
	PackedWidths       bool
}

func OptionsOfPacket(packet *LinksPacket) BinaryLinoOptions {
	min, max := uint64(2), uint64(2)
	width := uint8(0)
	packed := false
	for _, s := range packet.Sections {
		if width != 0 && width != s.Width {
			packed = true
		}
		width = s.Width
		for _, r := range s.Links {
			n := uint64(len(r))
			if n < min {
				min = n
			}
			if n > max {
				max = n
			}
		}
	}
	return BinaryLinoOptions{packet.ExternalReferences, ArityRange{min, &max}, packed}
}

// Section is a run of consecutive links with a gap, arity range and reference width.
type Section struct {
	Gap   uint64
	Arity ArityRange
	Width uint8
	Links [][]Reference
}

// LinksPacket contains raw links. Document mapping is an independent operation.
type LinksPacket struct {
	ExternalReferences bool
	Sections           []Section
}

var binaryWidths = [4]uint8{1, 2, 4, 8}

// Internal typed failures unwind only to public codec entry points; unrelated panics propagate.
type binaryFailure struct{ err error }

func failBinary(err error) { panic(binaryFailure{err}) }
func demand(ok bool, message string) {
	if !ok {
		failBinary(fmt.Errorf("binary notation: %s", message))
	}
}
func binaryRecover(err *error) {
	if value := recover(); value != nil {
		if failure, ok := value.(binaryFailure); ok {
			*err = failure.err
		} else {
			panic(value)
		}
	}
}
func add64(a, b uint64) uint64 { demand(a <= math.MaxUint64-b, "uint64 overflow"); return a + b }
func widthCode(width uint8) int {
	for i, w := range binaryWidths {
		if width == w {
			return i
		}
	}
	demand(false, "invalid width")
	return 0
}
func referenceWidth(r Reference, external bool) uint8 {
	demand(!r.External || external, "external references disabled")
	for _, w := range binaryWidths {
		bits := uint(w) * 8
		if external {
			bits--
		}
		if bits == 64 || r.Value < (uint64(1)<<bits) {
			return w
		}
	}
	demand(false, "reference exceeds capacity")
	return 0
}
func (p *LinksPacket) Links() []PacketLink {
	result := []PacketLink{}
	address := uint64(1)
	for _, s := range p.Sections {
		address += s.Gap
		for _, r := range s.Links {
			result = append(result, PacketLink{address, r})
			address++
		}
	}
	return result
}
func (p *LinksPacket) validate(limits DecodeLimits) {
	demand(uint64(len(p.Sections)) <= limits.MaxLinks, "too many sections")
	address, links, references := uint64(1), uint64(0), uint64(0)
	for _, s := range p.Sections {
		widthCode(s.Width)
		s.Arity.validate()
		address = add64(add64(address, s.Gap), uint64(len(s.Links)))
		links = add64(links, uint64(len(s.Links)))
		demand(links <= limits.MaxLinks, "too many links")
		for _, r := range s.Links {
			demand(s.Arity.contains(uint64(len(r))), "link outside arity")
			references = add64(references, uint64(len(r)))
			demand(references <= limits.MaxReferences, "too many references")
			for _, ref := range r {
				demand(referenceWidth(ref, p.ExternalReferences) <= s.Width, "reference outside width")
			}
		}
	}
}
func putLeb(out *bytes.Buffer, value uint64) {
	for value >= 128 {
		out.WriteByte(byte(value&127) | 128)
		value >>= 7
	}
	out.WriteByte(byte(value))
}
func (p *LinksPacket) toBytes(limits DecodeLimits) []byte {
	p.validate(limits)
	var out bytes.Buffer
	header := byte(0x10)
	if p.ExternalReferences {
		header |= 1
	}
	compact := len(p.Sections) == 0
	if len(p.Sections) == 1 {
		s := p.Sections[0]
		compact = s.Gap == 5 && s.Arity.normalized().Min == 2 && s.Arity.fixed() && len(s.Links) > 0
	}
	if compact {
		width, count := uint8(1), uint64(0)
		if len(p.Sections) > 0 {
			width = p.Sections[0].Width
			count = uint64(len(p.Sections[0].Links))
		}
		out.WriteByte(header | byte(widthCode(width)<<2))
		putLeb(&out, count)
	} else {
		out.WriteByte(header | 2)
		putLeb(&out, uint64(len(p.Sections)))
		for _, s := range p.Sections {
			a := s.Arity.normalized()
			shape := a.Min<<4 | uint64(widthCode(s.Width))
			if s.Gap > 0 {
				shape |= 4
			}
			if !a.fixed() {
				shape |= 8
			}
			putLeb(&out, shape)
			if s.Gap > 0 {
				putLeb(&out, s.Gap)
			}
			if !a.fixed() {
				extra := uint64(0)
				if a.Max != nil {
					extra = *a.Max - a.Min
				}
				putLeb(&out, extra)
			}
			putLeb(&out, uint64(len(s.Links)))
		}
	}
	for _, s := range p.Sections {
		a := s.Arity.normalized()
		for _, link := range s.Links {
			if !a.fixed() {
				putLeb(&out, uint64(len(link))-a.Min)
			}
			for _, r := range link {
				raw := r.Value
				if r.External {
					if raw == 0 {
						raw = uint64(1) << (uint(s.Width)*8 - 1)
					} else {
						raw = -raw
					}
				}
				var data [8]byte
				binary.LittleEndian.PutUint64(data[:], raw)
				out.Write(data[:s.Width])
			}
		}
	}
	return out.Bytes()
}
func (p *LinksPacket) ToBytes(configured ...DecodeLimits) (data []byte, err error) {
	defer binaryRecover(&err)
	limits := DefaultDecodeLimits()
	if len(configured) > 0 {
		limits = configured[0]
	}
	data = p.toBytes(limits)
	return
}
func (p *LinksPacket) WriteTo(writer io.Writer, limits DecodeLimits) (err error) {
	defer binaryRecover(&err)
	data := p.toBytes(limits)
	for len(data) > 0 {
		n, e := writer.Write(data)
		if e != nil {
			return e
		}
		if n <= 0 {
			return io.ErrShortWrite
		}
		data = data[n:]
	}
	return nil
}
func readRaw(reader io.Reader, width uint8) uint64 {
	var data [8]byte
	_, err := io.ReadFull(reader, data[:width])
	if err != nil {
		failBinary(err)
	}
	return binary.LittleEndian.Uint64(data[:])
}
func readLeb(reader io.Reader) uint64 {
	value := uint64(0)
	for shift := uint(0); shift < 64; shift += 7 {
		b := readRaw(reader, 1)
		demand(shift != 63 || b&127 <= 1, "LEB128 overflow")
		value |= (b & 127) << shift
		if b < 128 {
			return value
		}
	}
	demand(false, "LEB128 overflow")
	return 0
}

// ReadPacket reads exactly one packet. Nil means a clean EOF, never truncation.
func ReadPacket(reader io.Reader, limits DecodeLimits) (packet *LinksPacket, err error) {
	defer binaryRecover(&err)
	var first [1]byte
	_, err = io.ReadFull(reader, first[:])
	if err == io.EOF {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	header := first[0]
	demand(header&0xf0 == 0x10, "unsupported binary version")
	packet = &LinksPacket{ExternalReferences: header&1 != 0}
	counts := []uint64{}
	if header&2 != 0 {
		demand(header&12 == 0, "explicit header width bits set")
		sections := readLeb(reader)
		demand(sections <= limits.MaxLinks, "too many sections")
		address, total := uint64(1), uint64(0)
		for i := uint64(0); i < sections; i++ {
			shape := readLeb(reader)
			gap := uint64(0)
			if shape&4 != 0 {
				gap = readLeb(reader)
			}
			min := shape >> 4
			demand(min > 0, "invalid arity")
			a := ExactArity(min)
			if shape&8 != 0 {
				extra := readLeb(reader)
				a.Max = nil
				if extra != 0 {
					max := add64(min, extra)
					a.Max = &max
				}
			}
			a.validate()
			count := readLeb(reader)
			address = add64(add64(address, gap), count)
			total = add64(total, count)
			demand(total <= limits.MaxLinks, "too many links")
			packet.Sections = append(packet.Sections, Section{gap, a, binaryWidths[shape&3], nil})
			counts = append(counts, count)
		}
	} else {
		count := readLeb(reader)
		add64(6, count)
		demand(count <= limits.MaxLinks, "too many links")
		if count != 0 {
			packet.Sections = append(packet.Sections, Section{5, ExactArity(2), binaryWidths[(header>>2)&3], nil})
			counts = append(counts, count)
		}
	}
	refs := uint64(0)
	for i := range packet.Sections {
		s := &packet.Sections[i]
		for j := uint64(0); j < counts[i]; j++ {
			length := s.Arity.Min
			if !s.Arity.fixed() {
				length = add64(length, readLeb(reader))
			}
			demand(s.Arity.contains(length), "link outside arity")
			refs = add64(refs, length)
			demand(refs <= limits.MaxReferences, "too many references")
			link := []Reference{}
			for k := uint64(0); k < length; k++ {
				raw := readRaw(reader, s.Width)
				r := Reference{raw, false}
				top := uint64(1) << (uint(s.Width)*8 - 1)
				if packet.ExternalReferences && raw >= top {
					r.External = true
					if raw == top {
						r.Value = 0
					} else {
						r.Value = -raw
						if s.Width < 8 {
							r.Value &= (uint64(1) << (uint(s.Width) * 8)) - 1
						}
					}
				}
				link = append(link, r)
			}
			s.Links = append(s.Links, link)
		}
	}
	return packet, nil
}
func PacketFromBytes(data []byte, limits DecodeLimits) (packet *LinksPacket, err error) {
	reader := bytes.NewReader(data)
	packet, err = ReadPacket(reader, limits)
	if err != nil {
		return
	}
	if packet == nil {
		return nil, fmt.Errorf("binary notation: empty input")
	}
	if reader.Len() != 0 {
		return nil, fmt.Errorf("binary notation: trailing bytes")
	}
	return
}
func ParsePacketLinks(text string) (result []PacketLink, err error) {
	defer binaryRecover(&err)
	result = []PacketLink{}
	for _, entry := range strings.Split(text, ";") {
		if strings.TrimSpace(entry) == "" {
			continue
		}
		parts := strings.Split(entry, ":")
		demand(len(parts) == 2, "invalid raw links")
		a, e := strconv.ParseUint(strings.TrimSpace(parts[0]), 10, 64)
		if e != nil {
			failBinary(e)
		}
		refs := []Reference{}
		for _, word := range strings.Fields(parts[1]) {
			external := strings.HasPrefix(word, "#")
			v, e := strconv.ParseUint(strings.TrimPrefix(word, "#"), 10, 64)
			if e != nil {
				failBinary(e)
			}
			refs = append(refs, Reference{v, external})
		}
		result = append(result, PacketLink{a, refs})
	}
	return
}
func PackLinks(external bool, links []PacketLink, packed bool) (packet *LinksPacket, err error) {
	defer binaryRecover(&err)
	packet = packLinks(external, links, packed)
	return
}
func packLinks(external bool, links []PacketLink, packed bool) *LinksPacket {
	needs := make([]uint8, len(links))
	previous := uint64(0)
	for i, l := range links {
		demand(l.Address > previous && l.Address < math.MaxUint64 && len(l.References) > 0, "invalid address order or empty link")
		previous = l.Address
		needs[i] = 1
		for _, r := range l.References {
			w := referenceWidth(r, external)
			if w > needs[i] {
				needs[i] = w
			}
		}
	}
	type run struct {
		count int
		width uint8
	}
	plan := func(packed bool) []run {
		if len(links) == 0 {
			return nil
		}
		widest := uint8(1)
		for _, n := range needs {
			if n > widest {
				widest = n
			}
		}
		cheapest := func(c [8]uint64) int {
			best := 0
			for s := 1; s < 8; s++ {
				if c[s] < c[best] {
					best = s
				}
			}
			return best
		}
		const unreachable = math.MaxUint64 / 4
		costs := [8]uint64{}
		for i := range costs {
			costs[i] = unreachable
		}
		opens := make([]uint8, len(links))
		bests := make([]int, len(links))
		for i, l := range links {
			best := cheapest(costs)
			bests[i] = best
			before := uint64(0)
			if i > 0 {
				before = costs[best]
			}
			var next [8]uint64
			for state := 0; state < 8; state++ {
				next[state] = unreachable
				width := binaryWidths[state/2]
				variable := uint64(state % 2)
				if (!packed && width != widest) || width < needs[i] {
					continue
				}
				opening := before + 2 + variable
				continuing := uint64(unreachable)
				if i > 0 && links[i-1].Address+1 == l.Address && (variable != 0 || len(links[i-1].References) == len(l.References)) {
					continuing = costs[state]
				}
				body := uint64(len(l.References))*uint64(width) + variable
				if continuing <= opening {
					next[state] = continuing + body
				} else {
					next[state] = opening + body
					opens[i] |= 1 << state
				}
			}
			costs = next
		}
		result := []run{}
		end, state := len(links), cheapest(costs)
		for i := len(links) - 1; i >= 0; i-- {
			if opens[i]&(1<<state) != 0 {
				result = append(result, run{end - i, binaryWidths[state/2]})
				end = i
				state = bests[i]
			}
		}
		for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
			result[i], result[j] = result[j], result[i]
		}
		return result
	}
	layout := func(runs []run) *LinksPacket {
		p := &LinksPacket{ExternalReferences: external}
		index, address := 0, uint64(1)
		for _, r := range runs {
			members := links[index : index+r.count]
			min, max := uint64(math.MaxUint64), uint64(0)
			refs := [][]Reference{}
			for _, l := range members {
				n := uint64(len(l.References))
				if n < min {
					min = n
				}
				if n > max {
					max = n
				}
				refs = append(refs, append([]Reference(nil), l.References...))
			}
			start := members[0].Address
			p.Sections = append(p.Sections, Section{start - address, ArityRange{min, &max}, r.width, refs})
			index += r.count
			address = start + uint64(r.count)
		}
		return p
	}
	uniform := layout(plan(false))
	if !packed {
		return uniform
	}
	candidate := layout(plan(true))
	if len(candidate.toBytes(UnlimitedDecodeLimits())) < len(uniform.toBytes(UnlimitedDecodeLimits())) {
		return candidate
	}
	return uniform
}

type binaryNode struct {
	kind  byte
	value uint64
}
type binaryEncoder struct {
	options          BinaryLinoOptions
	doublets, tuples [][]binaryNode
	created          map[string]binaryNode
	powers           []binaryNode
}

func (e *binaryEncoder) link(items []binaryNode) binaryNode {
	var key strings.Builder
	doublet := len(items) == 2
	for _, n := range items {
		key.WriteByte(n.kind)
		key.WriteString(strconv.FormatUint(n.value, 10))
		key.WriteByte(',')
		if n.kind == 't' {
			doublet = false
		}
	}
	if n, ok := e.created[key.String()]; ok {
		return n
	}
	var n binaryNode
	if doublet {
		n = binaryNode{'d', uint64(len(e.doublets))}
		e.doublets = append(e.doublets, items)
	} else {
		n = binaryNode{'t', uint64(len(e.tuples))}
		e.tuples = append(e.tuples, items)
	}
	e.created[key.String()] = n
	return n
}
func (e *binaryEncoder) chain(items []binaryNode) binaryNode {
	tail := binaryNode{'i', 0}
	for i := len(items) - 1; i >= 0; i-- {
		tail = e.link([]binaryNode{items[i], tail})
	}
	return tail
}
func (e *binaryEncoder) typed(marker uint64, elements []binaryNode) binaryNode {
	items := append([]binaryNode{{'i', marker}}, elements...)
	if len(items) != 2 && e.options.Arity.contains(uint64(len(items))) {
		return e.link(items)
	}
	return e.link([]binaryNode{{'i', marker}, e.chain(elements)})
}
func (e *binaryEncoder) list(elements []binaryNode) binaryNode {
	if len(elements) == 0 {
		return binaryNode{'i', 0}
	}
	if len(elements) == 2 || e.options.Arity.contains(uint64(len(elements))) {
		return e.link(elements)
	}
	return e.typed(4, elements)
}
func (e *binaryEncoder) unary(value uint64) binaryNode {
	powers := []binaryNode{}
	for bit := 63; bit >= 0; bit-- {
		if value&(uint64(1)<<bit) != 0 {
			for len(e.powers) <= bit {
				p := e.powers[len(e.powers)-1]
				e.powers = append(e.powers, e.link([]binaryNode{p, p}))
			}
			powers = append(powers, e.powers[bit])
		}
	}
	if len(powers) == 0 {
		return binaryNode{'i', 0}
	}
	sum := powers[len(powers)-1]
	for i := len(powers) - 2; i >= 0; i-- {
		sum = e.link([]binaryNode{powers[i], sum})
	}
	return sum
}
func (e *binaryEncoder) scalar(v uint64) binaryNode {
	if e.options.ExternalReferences && v <= math.MaxInt64 {
		return binaryNode{'e', v}
	}
	return e.unary(v)
}
func (e *binaryEncoder) reference(text string) binaryNode {
	canonical := text != "" && (text == "0" || text[0] != '0') && strings.IndexFunc(text, func(r rune) bool { return r < '0' || r > '9' }) < 0
	if canonical {
		if v, err := strconv.ParseUint(text, 10, 64); err == nil {
			if e.options.ExternalReferences && v <= math.MaxInt64 {
				return binaryNode{'e', v}
			}
			return e.link([]binaryNode{{'i', 2}, e.unary(v)})
		}
	}
	elements := []binaryNode{}
	for _, r := range text {
		elements = append(elements, e.scalar(uint64(r)))
	}
	return e.typed(3, elements)
}
func (e *binaryEncoder) encode(n *Link) binaryNode {
	if n.ID != nil && len(n.Values) == 0 {
		return e.reference(*n.ID)
	}
	elements := []binaryNode{}
	if n.ID != nil {
		elements = append(elements, e.reference(*n.ID))
	}
	for _, v := range n.Values {
		elements = append(elements, e.encode(v))
	}
	if n.ID != nil {
		return e.typed(5, elements)
	}
	return e.list(elements)
}
func (e *binaryEncoder) finish() *LinksPacket {
	links := []PacketLink{}
	for _, items := range append(e.doublets, e.tuples...) {
		refs := []Reference{}
		for _, n := range items {
			r := Reference{n.value, n.kind == 'e'}
			if n.kind == 'd' || n.kind == 't' {
				r.Value = 6 + n.value
				if n.kind == 't' {
					r.Value += uint64(len(e.doublets))
				}
			}
			refs = append(refs, r)
		}
		links = append(links, PacketLink{6 + uint64(len(links)), refs})
	}
	return packLinks(e.options.ExternalReferences, links, e.options.PackedWidths)
}

type binaryDecoder struct {
	limits         DecodeLimits
	links          [][]Reference
	unary          []*uint64
	nodes, strings uint64
}

func newBinaryDecoder(p *LinksPacket, limits DecodeLimits) *binaryDecoder {
	p.validate(limits)
	d := &binaryDecoder{limits: limits, nodes: limits.MaxNodes, strings: limits.MaxStringBytes}
	value := func(r Reference) *uint64 {
		if r.External {
			return nil
		}
		if r.Value <= 1 {
			v := r.Value
			return &v
		}
		if r.Value >= 6 {
			return d.unary[r.Value-6]
		}
		return nil
	}
	for _, l := range p.Links() {
		demand(l.Address == 6+uint64(len(d.links)), "document links must be contiguous from 6")
		for _, r := range l.References {
			demand(r.External || r.Value < l.Address, "document contains forward reference")
		}
		var number *uint64
		if len(l.References) == 2 {
			a, b := value(l.References[0]), value(l.References[1])
			if a != nil && b != nil && *a <= math.MaxUint64-*b {
				v := *a + *b
				number = &v
			}
		}
		d.unary = append(d.unary, number)
		d.links = append(d.links, l.References)
	}
	return d
}
func (d *binaryDecoder) chain(tail Reference) []Reference {
	result := []Reference{}
	for tail.External || tail.Value != 0 {
		demand(!tail.External && tail.Value >= 6, "broken chain")
		items := d.links[tail.Value-6]
		demand(len(items) == 2 && uint64(len(result)) < d.limits.MaxNodes, "broken or excessive chain")
		result = append(result, items[0])
		tail = items[1]
	}
	return result
}
func (d *binaryDecoder) number(r Reference) uint64 {
	if r.External || r.Value <= 1 {
		return r.Value
	}
	demand(r.Value >= 6 && d.unary[r.Value-6] != nil, "expected unary number")
	return *d.unary[r.Value-6]
}
func (d *binaryDecoder) text(text string) *Link {
	demand(uint64(len(text)) <= d.strings, "string budget exceeded")
	d.strings -= uint64(len(text))
	return NewRef(text)
}
func (d *binaryDecoder) decode(r Reference, depth uint64) *Link {
	demand(depth < d.limits.MaxDepth && d.nodes > 0, "node or depth budget exceeded")
	d.nodes--
	if r.External {
		return d.text(strconv.FormatUint(r.Value, 10))
	}
	if r.Value == 0 {
		return NewValuesLink(nil)
	}
	demand(r.Value >= 6, "standalone marker")
	items := d.links[r.Value-6]
	elements := items
	if !items[0].External && items[0].Value >= 1 && items[0].Value <= 5 {
		marker := items[0].Value
		elements = items[1:]
		if len(items) == 2 && marker != 2 {
			elements = d.chain(items[1])
		}
		switch marker {
		case 2:
			demand(len(elements) == 1, "number needs one value")
			return d.text(strconv.FormatUint(d.number(elements[0]), 10))
		case 3:
			var text strings.Builder
			for _, e := range elements {
				p := d.number(e)
				demand(p <= utf8.MaxRune && !(p >= 0xd800 && p <= 0xdfff), "invalid Unicode scalar")
				demand(uint64(utf8.RuneLen(rune(p))) <= d.strings-uint64(text.Len()), "string budget exceeded")
				text.WriteRune(rune(p))
			}
			return d.text(text.String())
		case 5:
			demand(len(elements) > 0, "identified needs id")
			id := d.decode(elements[0], depth)
			demand(id.ID != nil && len(id.Values) == 0, "id must be reference")
			values := []*Link{}
			for _, e := range elements[1:] {
				values = append(values, d.decode(e, depth+1))
			}
			return NewLink(id.ID, values)
		case 4:
		default:
			demand(false, "invalid typed marker")
		}
	}
	values := []*Link{}
	for _, e := range elements {
		values = append(values, d.decode(e, depth+1))
	}
	return NewValuesLink(values)
}
func (d *binaryDecoder) document() []*Link {
	result := []*Link{}
	if len(d.links) == 0 {
		return result
	}
	root := d.links[len(d.links)-1]
	elements := root
	if len(root) == 2 && !root[0].External && root[0].Value == 4 {
		elements = d.chain(root[1])
	} else {
		demand(root[0].External || root[0].Value < 1 || root[0].Value > 5, "root must be list")
	}
	for _, e := range elements {
		result = append(result, d.decode(e, 0))
	}
	return result
}

// BinaryLinoCodec preserves native models. Text helpers explicitly use canonical groups.
type BinaryLinoCodec struct {
	Options BinaryLinoOptions
	Limits  DecodeLimits
}

func NewBinaryLinoCodec() *BinaryLinoCodec { return &BinaryLinoCodec{Limits: DefaultDecodeLimits()} }
func (c *BinaryLinoCodec) EncodePacket(document []*Link) (packet *LinksPacket, err error) {
	defer binaryRecover(&err)
	c.Options.Arity.validate()
	demand(c.Options.Arity.contains(2), "arity must contain 2")
	type pendingNode struct {
		node  *Link
		depth uint64
	}
	pending := []pendingNode{}
	for _, n := range document {
		pending = append(pending, pendingNode{n, 0})
	}
	nodes, strings := uint64(0), uint64(0)
	for len(pending) > 0 {
		n := pending[len(pending)-1]
		pending = pending[:len(pending)-1]
		demand(n.node != nil && n.depth < c.Limits.MaxDepth, "invalid model or excessive depth")
		nodes = add64(nodes, 1)
		if n.node.ID != nil {
			demand(utf8.ValidString(*n.node.ID), "invalid UTF-8")
			strings = add64(strings, uint64(len(*n.node.ID)))
			if len(n.node.Values) > 0 {
				nodes = add64(nodes, 1)
			}
		}
		demand(nodes <= c.Limits.MaxNodes && strings <= c.Limits.MaxStringBytes, "model budget exceeded")
		for _, v := range n.node.Values {
			pending = append(pending, pendingNode{v, n.depth + 1})
		}
	}
	e := &binaryEncoder{options: c.Options, created: map[string]binaryNode{}, powers: []binaryNode{{'i', 1}}}
	if len(document) > 0 {
		elements := []binaryNode{}
		for _, n := range document {
			elements = append(elements, e.encode(n))
		}
		e.list(elements)
	}
	packet = e.finish()
	packet.validate(c.Limits)
	return
}
func (c *BinaryLinoCodec) Encode(document []*Link) (data []byte, err error) {
	defer binaryRecover(&err)
	p, err := c.EncodePacket(document)
	if err != nil {
		return nil, err
	}
	data = p.toBytes(c.Limits)
	return
}
func (c *BinaryLinoCodec) DecodePacket(packet *LinksPacket) (document []*Link, err error) {
	defer binaryRecover(&err)
	demand(packet != nil, "nil packet")
	document = newBinaryDecoder(packet, c.Limits).document()
	return
}
func (c *BinaryLinoCodec) Decode(data []byte) (document []*Link, err error) {
	p, err := PacketFromBytes(data, c.Limits)
	if err != nil {
		return nil, err
	}
	return c.DecodePacket(p)
}
func canonicalBinary(n *Link) *Link {
	if n.ID == nil && len(n.Values) == 1 && n.Values[0].ID != nil && len(n.Values[0].Values) == 0 {
		return n.Values[0]
	}
	values := []*Link{}
	for _, v := range n.Values {
		values = append(values, canonicalBinary(v))
	}
	return NewLink(n.ID, values)
}
func (c *BinaryLinoCodec) ParseDocument(text string) ([]*Link, error) {
	document, err := Parse(text)
	if err != nil {
		return nil, err
	}
	for i, n := range document {
		document[i] = canonicalBinary(n)
	}
	return document, nil
}
func FormatBinaryReference(text string) string {
	needs := text == "" || strings.HasPrefix(text, "#") || strings.IndexFunc(text, func(r rune) bool {
		return unicode.IsSpace(r) || r >= 0x1c && r <= 0x1f || r == 0xfeff || strings.ContainsRune("():\"'`", r)
	}) >= 0
	if !needs {
		return text
	}
	chosen, count := rune(0), int(math.MaxInt)
	for _, q := range []rune{'\'', '"', '`'} {
		if strings.HasPrefix(text, string(q)) {
			continue
		}
		longest, run := 0, 0
		for _, r := range text {
			if r == q {
				run++
			} else {
				run = 0
			}
			if run > longest {
				longest = run
			}
		}
		n := (longest + 1) | 1
		if n < count {
			chosen, count = q, n
		}
	}
	delimiter := strings.Repeat(string(chosen), count)
	return delimiter + text + delimiter
}
func FormatBinaryDocument(document []*Link) string {
	var nested func(*Link, bool) string
	nested = func(n *Link, top bool) string {
		if n.ID != nil && len(n.Values) == 0 {
			return FormatBinaryReference(*n.ID)
		}
		parts := []string{}
		for _, v := range n.Values {
			parts = append(parts, nested(v, false))
		}
		values := strings.Join(parts, " ")
		if n.ID != nil {
			return "(" + FormatBinaryReference(*n.ID) + ": " + values + ")"
		}
		if len(n.Values) == 1 && n.Values[0].ID != nil && len(n.Values[0].Values) == 0 {
			return "((" + values + "))"
		}
		if top && len(n.Values) >= 2 {
			return values
		}
		return "(" + values + ")"
	}
	parts := []string{}
	for _, n := range document {
		parts = append(parts, nested(n, true))
	}
	return strings.Join(parts, "\n")
}
func (c *BinaryLinoCodec) EncodeText(text string) ([]byte, error) {
	document, err := c.ParseDocument(text)
	if err != nil {
		return nil, err
	}
	return c.Encode(document)
}
func (c *BinaryLinoCodec) DecodeText(data []byte) (string, error) {
	document, err := c.Decode(data)
	if err != nil {
		return "", err
	}
	return FormatBinaryDocument(document), nil
}
