// Command benchmark is the Go side of the Links Notation token efficiency
// benchmarks.
//
// The Rust benchmark is the one that writes the documents and the report. Every
// other language answers the two questions that make those numbers portable
// rather than a property of one implementation:
//
//  1. does this language's own links-notation parser accept the generated
//     Links Notation documents;
//  2. does this language's own tokenizer count them the same way.
//
// It writes benchmarks/results/go.json and fails when a count differs from
// benchmarks/results/rust.json.
//
// Usage: go run . [--check] [--verbose] from benchmarks/go.
// With --check the results file is compared instead of written, which is what
// CI runs to catch a stale commit.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"unicode/utf8"

	lino "github.com/link-foundation/links-notation/go"
	"github.com/pkoukk/tiktoken-go"
	tiktokenLoader "github.com/pkoukk/tiktoken-go-loader"
)

const language = "go"

var metricKeys = [4]string{"tokens_o200k", "tokens_cl100k", "chars", "bytes"}

// Metrics holds the four measurements taken of every document.
type Metrics struct {
	TokensO200k  int `json:"tokens_o200k"`
	TokensCl100k int `json:"tokens_cl100k"`
	Chars        int `json:"chars"`
	Bytes        int `json:"bytes"`
}

func (m Metrics) get(key string) int {
	switch key {
	case "tokens_o200k":
		return m.TokensO200k
	case "tokens_cl100k":
		return m.TokensCl100k
	case "chars":
		return m.Chars
	}
	return m.Bytes
}

func (m *Metrics) add(other Metrics) {
	m.TokensO200k += other.TokensO200k
	m.TokensCl100k += other.TokensCl100k
	m.Chars += other.Chars
	m.Bytes += other.Bytes
}

// Representation is one dataset's entry in benchmarks/generated/index.json.
type Representation struct {
	Dataset   string            `json:"dataset"`
	Structure string            `json:"structure"`
	Profile   string            `json:"profile"`
	Files     map[string]string `json:"files"`
}

type index struct {
	Schema          int              `json:"schema"`
	Representations []Representation `json:"representations"`
}

// DatasetResult is one dataset's entry in a results file.
type DatasetResult struct {
	Name      string             `json:"name"`
	Structure string             `json:"structure"`
	Profile   string             `json:"profile"`
	Formats   map[string]Metrics `json:"formats"`
}

// Results is the whole results file, in the shape every language writes.
type Results struct {
	Schema     int                `json:"schema"`
	Generator  string             `json:"generator"`
	Tokenizers map[string]string  `json:"tokenizers"`
	Datasets   []DatasetResult    `json:"datasets"`
	Totals     map[string]Metrics `json:"totals"`
}

func main() {
	check := flag.Bool("check", false, "compare the results file instead of writing it")
	verbose := flag.Bool("verbose", false, "report progress per dataset")
	flag.Parse()
	if os.Getenv("CI_VERBOSE") == "true" {
		*verbose = true
	}

	if err := run(*check, *verbose); err != nil {
		fmt.Fprintf(os.Stderr, "%s: %v\n", language, err)
		os.Exit(1)
	}
}

func run(check, verbose bool) error {
	root, err := benchmarksDirectory()
	if err != nil {
		return err
	}

	// The offline loader carries the encodings with the module, so the
	// benchmark does not depend on a download to produce a number.
	tiktoken.SetBpeLoader(tiktokenLoader.NewOfflineLoader())
	o200k, err := tiktoken.GetEncoding("o200k_base")
	if err != nil {
		return fmt.Errorf("loading o200k_base: %w", err)
	}
	cl100k, err := tiktoken.GetEncoding("cl100k_base")
	if err != nil {
		return fmt.Errorf("loading cl100k_base: %w", err)
	}

	var generated index
	if err := readJSON(root, "generated/index.json", &generated); err != nil {
		return err
	}

	parser := lino.NewParser()
	datasets := make([]DatasetResult, 0, len(generated.Representations))
	totals := map[string]Metrics{}

	for _, entry := range generated.Representations {
		formats := map[string]Metrics{}
		for _, format := range sortedKeys(entry.Files) {
			text, err := readText(root, entry.Files[format])
			if err != nil {
				return err
			}
			if len(format) >= 4 && format[:4] == "lino" {
				// Parsing with this language's own implementation is the
				// point: a document only counts if the notation is portable.
				if _, err := parser.Parse(text); err != nil {
					return fmt.Errorf("parsing %s: %w", entry.Files[format], err)
				}
			}
			metrics := Metrics{
				TokensO200k:  len(o200k.Encode(text, nil, nil)),
				TokensCl100k: len(cl100k.Encode(text, nil, nil)),
				Chars:        utf8.RuneCountInString(text),
				Bytes:        len(text),
			}
			formats[format] = metrics
			running := totals[format]
			running.add(metrics)
			totals[format] = running
		}
		if verbose {
			fmt.Fprintf(os.Stderr, "%s: measured %d formats\n", entry.Dataset, len(formats))
		}
		datasets = append(datasets, DatasetResult{
			Name:      entry.Dataset,
			Structure: entry.Structure,
			Profile:   entry.Profile,
			Formats:   formats,
		})
	}

	results := Results{
		Schema:     generated.Schema,
		Generator:  language,
		Tokenizers: map[string]string{"primary": "o200k_base", "secondary": "cl100k_base"},
		Datasets:   datasets,
		Totals:     totals,
	}

	var reference Results
	if err := readJSON(root, "results/rust.json", &reference); err != nil {
		return err
	}
	if differences := compare(results, reference); len(differences) > 0 {
		fmt.Fprintf(os.Stderr, "%s: %d measurement(s) differ from the Rust results:\n", language, len(differences))
		for i, difference := range differences {
			if i == 20 {
				break
			}
			fmt.Fprintf(os.Stderr, "  - %s\n", difference)
		}
		return fmt.Errorf("results do not agree with Rust")
	}

	encoded, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		return err
	}
	encoded = append(encoded, '\n')

	path := fmt.Sprintf("results/%s.json", language)
	if check {
		existing, err := os.ReadFile(filepath.Join(root, path))
		if err != nil || string(existing) != string(encoded) {
			return fmt.Errorf("%s is out of date; run go run . from benchmarks/go", path)
		}
		fmt.Printf("%s: %s is up to date and agrees with the Rust results.\n", language, path)
		return nil
	}
	if err := os.WriteFile(filepath.Join(root, path), encoded, 0o644); err != nil {
		return err
	}
	fmt.Printf("%s: wrote %s; every measurement agrees with the Rust results.\n", language, path)
	return nil
}

// compare reports every measurement that differs from the reference results.
func compare(results, reference Results) []string {
	differences := []string{}
	byName := map[string]DatasetResult{}
	for _, dataset := range reference.Datasets {
		byName[dataset.Name] = dataset
	}
	for _, dataset := range results.Datasets {
		expected, ok := byName[dataset.Name]
		if !ok {
			differences = append(differences, dataset.Name+": missing from the Rust results")
			continue
		}
		for _, format := range sortedMetricKeys(dataset.Formats) {
			for _, key := range metricKeys {
				value := dataset.Formats[format].get(key)
				other := expected.Formats[format].get(key)
				if value != other {
					differences = append(differences, fmt.Sprintf(
						"%s/%s/%s: %d here, %d in Rust", dataset.Name, format, key, value, other))
				}
			}
		}
	}
	return differences
}

// benchmarksDirectory finds the benchmarks directory from the working
// directory, so the command runs from the repository root as well as from its
// own directory.
func benchmarksDirectory() (string, error) {
	if fromEnvironment := os.Getenv("BENCHMARKS_DIR"); fromEnvironment != "" {
		return fromEnvironment, nil
	}
	current, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		candidate := filepath.Join(current, "benchmarks", "generated", "index.json")
		if _, err := os.Stat(candidate); err == nil {
			return filepath.Join(current, "benchmarks"), nil
		}
		if _, err := os.Stat(filepath.Join(current, "generated", "index.json")); err == nil {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			return "", fmt.Errorf("no benchmarks directory above the working directory")
		}
		current = parent
	}
}

func readText(root, path string) (string, error) {
	contents, err := os.ReadFile(filepath.Join(root, path))
	if err != nil {
		return "", err
	}
	return string(contents), nil
}

func readJSON(root, path string, target any) error {
	contents, err := os.ReadFile(filepath.Join(root, path))
	if err != nil {
		return err
	}
	return json.Unmarshal(contents, target)
}

func sortedKeys(entries map[string]string) []string {
	keys := make([]string, 0, len(entries))
	for key := range entries {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func sortedMetricKeys(entries map[string]Metrics) []string {
	keys := make([]string, 0, len(entries))
	for key := range entries {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
