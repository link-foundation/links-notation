package lino

// FormatConfig holds configuration options for formatting links.
type FormatConfig struct {
	// LessParentheses omits parentheses when safe.
	LessParentheses bool

	// IndentString is the string used for each indentation level.
	IndentString string

	// PreferInline prefers inline formatting over indented.
	PreferInline bool

	// IndentByRefCount enables indentation when reference count exceeds threshold.
	IndentByRefCount int

	// IndentByLength enables indentation when line length exceeds threshold.
	IndentByLength int

	// GroupConsecutive groups consecutive links with the same ID.
	GroupConsecutive bool
}

// DefaultFormatConfig returns a FormatConfig with default values.
func DefaultFormatConfig() *FormatConfig {
	return &FormatConfig{
		LessParentheses:  false,
		IndentString:     "  ",
		PreferInline:     false,
		IndentByRefCount: 0,
		IndentByLength:   0,
		GroupConsecutive: false,
	}
}

// NewFormatConfig creates a new FormatConfig with the specified options.
func NewFormatConfig(lessParentheses bool) *FormatConfig {
	return &FormatConfig{
		LessParentheses:  lessParentheses,
		IndentString:     "  ",
		PreferInline:     false,
		IndentByRefCount: 0,
		IndentByLength:   0,
		GroupConsecutive: false,
	}
}

// ShouldIndentByRefCount checks if indentation should be used based on reference count.
func (c *FormatConfig) ShouldIndentByRefCount(count int) bool {
	return c.IndentByRefCount > 0 && count >= c.IndentByRefCount
}

// ShouldIndentByLength checks if indentation should be used based on line length.
func (c *FormatConfig) ShouldIndentByLength(line string) bool {
	return c.IndentByLength > 0 && len(line) > c.IndentByLength
}

// WithLessParentheses returns a copy with LessParentheses set.
func (c *FormatConfig) WithLessParentheses(value bool) *FormatConfig {
	copy := *c
	copy.LessParentheses = value
	return &copy
}

// WithIndentString returns a copy with IndentString set.
func (c *FormatConfig) WithIndentString(value string) *FormatConfig {
	copy := *c
	copy.IndentString = value
	return &copy
}

// WithPreferInline returns a copy with PreferInline set.
func (c *FormatConfig) WithPreferInline(value bool) *FormatConfig {
	copy := *c
	copy.PreferInline = value
	return &copy
}

// WithIndentByRefCount returns a copy with IndentByRefCount set.
func (c *FormatConfig) WithIndentByRefCount(value int) *FormatConfig {
	copy := *c
	copy.IndentByRefCount = value
	return &copy
}

// WithIndentByLength returns a copy with IndentByLength set.
func (c *FormatConfig) WithIndentByLength(value int) *FormatConfig {
	copy := *c
	copy.IndentByLength = value
	return &copy
}

// WithGroupConsecutive returns a copy with GroupConsecutive set.
func (c *FormatConfig) WithGroupConsecutive(value bool) *FormatConfig {
	copy := *c
	copy.GroupConsecutive = value
	return &copy
}
