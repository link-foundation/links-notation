#!/usr/bin/env python3
"""Draws the format comparison picture the README shows.

The four documents are read from the files next to this script, which
`generate.mjs` writes from `comparison.json`. Nothing here is typed by hand:
change the source data, run both generators, and the picture follows.

Usage: `python3 docs/comparison/generate_comparison_svgs.py [--check]`. With
`--check` the committed SVGs are compared instead of written.
"""
import re
import sys
from pathlib import Path

CHAR_WIDTH = 8.4
HERE = Path(__file__).resolve().parent

def get_theme_colors(theme):
    if theme == 'light':
        return {
            'bg_color': '#ffffff',
            'line_num_color': '#888888',
            'text_color': '#000000',
            'keyword_color': '#0000ff',
            'string_color': '#008000',
            'number_color': '#ff0000',
            'tag_color': '#800080',
            'punctuation_color': '#000000',
            'border_color': '#cccccc',
            'title_color': '#000000'
        }
    elif theme == 'dark':
        return {
            'bg_color': '#1e1e1e',
            'line_num_color': '#858585',
            'text_color': '#d4d4d4',
            'keyword_color': '#569cd6',
            'string_color': '#ce9178',
            'number_color': '#b5cea8',
            'tag_color': '#4ec9b0',
            'punctuation_color': '#d4d4d4',
            'border_color': '#3e3e3e',
            'title_color': '#cccccc'
        }
    else:
        return {
            'bg_color': 'transparent',
            'line_num_color': '#888888',
            'text_color': '#333333',
            'keyword_color': '#0066cc',
            'string_color': '#007700',
            'number_color': '#cc0000',
            'tag_color': '#660099',
            'punctuation_color': '#333333',
            'border_color': '#999999',
            'title_color': '#666666'
        }

def highlight_lino(line, colors):
    """Colour one line of Links Notation.

    The codec writes three kinds of line: a bare parenthesis, a key that opens
    a group, and a key followed by a value that is either a quoted string or a
    bare number.
    """
    result = []
    indent = len(line) - len(line.lstrip(' '))
    result.append((' ' * indent, colors['text_color']))

    content = line.lstrip(' ')

    for text in re.findall(r'"(?:[^"\\]|\\.)*"|[()]|[^\s()]+|\s+', content):
        if text.startswith('"'):
            result.append((text, colors['string_color']))
        elif text in ('(', ')'):
            result.append((text, colors['punctuation_color']))
        elif text.isspace():
            result.append((text, colors['text_color']))
        elif re.fullmatch(r'-?\d+(?:\.\d+)?', text):
            result.append((text, colors['number_color']))
        else:
            result.append((text, colors['keyword_color']))

    return result


def highlight_yaml(line, colors):
    result = []
    indent = len(line) - len(line.lstrip(' '))
    result.append((' ' * indent, colors['text_color']))

    content = line.lstrip(' ')

    if content.startswith('- '):
        result.append(('- ', colors['punctuation_color']))
        content = content[2:]

    if ':' in content:
        key, value = content.split(':', 1)
        result.append((key, colors['keyword_color']))
        result.append((':', colors['punctuation_color']))
        if value.strip():
            value_stripped = value.lstrip()
            spaces = value[:len(value) - len(value_stripped)]
            result.append((spaces, colors['text_color']))
            if value_stripped.isdigit():
                result.append((value_stripped, colors['number_color']))
            else:
                result.append((value_stripped, colors['string_color']))
    else:
        result.append((content, colors['text_color']))

    return result

def highlight_json(line, colors):
    result = []
    indent = len(line) - len(line.lstrip(' '))
    result.append((' ' * indent, colors['text_color']))

    content = line.lstrip(' ')

    i = 0
    while i < len(content):
        if content[i] in '{}[]':
            result.append((content[i], colors['punctuation_color']))
            i += 1
        elif content[i] == '"':
            end = content.find('"', i + 1)
            if end != -1:
                string_val = content[i:end+1]
                if i > 0 and content[i-1] == ' ' or i == 0:
                    result.append((string_val, colors['keyword_color']))
                else:
                    result.append((string_val, colors['string_color']))
                i = end + 1
            else:
                result.append((content[i], colors['text_color']))
                i += 1
        elif content[i] == ':':
            result.append((':', colors['punctuation_color']))
            i += 1
        elif content[i] == ',':
            result.append((',', colors['punctuation_color']))
            i += 1
        elif content[i].isdigit():
            j = i
            while j < len(content) and content[j].isdigit():
                j += 1
            result.append((content[i:j], colors['number_color']))
            i = j
        elif content[i] == ' ':
            result.append((' ', colors['text_color']))
            i += 1
        else:
            result.append((content[i], colors['text_color']))
            i += 1

    return result

def highlight_xml(line, colors):
    result = []
    indent = len(line) - len(line.lstrip(' '))
    result.append((' ' * indent, colors['text_color']))

    content = line.lstrip(' ')

    i = 0
    while i < len(content):
        if content[i] == '<':
            end = content.find('>', i)
            if end != -1:
                tag = content[i:end+1]
                result.append(('<', colors['tag_color']))
                if tag[1] == '/':
                    result.append(('/', colors['tag_color']))
                    result.append((tag[2:-1], colors['tag_color']))
                else:
                    result.append((tag[1:-1], colors['tag_color']))
                result.append(('>', colors['tag_color']))
                i = end + 1
            else:
                result.append((content[i], colors['text_color']))
                i += 1
        else:
            j = i
            while j < len(content) and content[j] != '<':
                j += 1
            text_content = content[i:j]
            if text_content.isdigit():
                result.append((text_content, colors['number_color']))
            else:
                result.append((text_content, colors['string_color']))
            i = j

    return result

def render_line(tokens, x_start, y):
    svg_parts = []
    x = x_start
    for text, color in tokens:
        if text:
            escaped = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
            svg_parts.append(f'<tspan x="{x}" y="{y}" fill="{color}">{escaped}</tspan>')
            x += len(text) * CHAR_WIDTH
    return ''.join(svg_parts)

def get_format_data():
    """Read the four documents, so the picture cannot drift from the files."""
    def lines_of(name):
        return (HERE / name).read_text(encoding='utf-8').rstrip('\n').split('\n')

    return (
        lines_of('comparison.lino'),
        lines_of('comparison.yaml'),
        lines_of('comparison.json'),
        lines_of('comparison.xml'),
    )


LINE_HEIGHT = 20
TITLE_HEIGHT = 45
GUTTER = 50
PADDING = 20
MARGIN = 20
GRID_TOP = 50

THEMES = {'light': 'comparison-light.svg',
          'dark': 'comparison-dark.svg',
          'universal': 'comparison.svg'}


def create_svg_comparison(theme='light'):
    colors = get_theme_colors(theme)
    lino_lines, yaml_lines, json_lines, xml_lines = get_format_data()

    boxes = [
        ('LiNo', lino_lines, highlight_lino),
        ('YAML', yaml_lines, highlight_yaml),
        ('JSON', json_lines, highlight_json),
        ('XML', xml_lines, highlight_xml),
    ]

    # The grid is sized from the documents, so a longer example widens the
    # picture instead of spilling out of it.
    widest = max(len(line) for _, lines, _ in boxes for line in lines)
    tallest = max(len(lines) for _, lines, _ in boxes)
    box_width = GUTTER + PADDING + int(widest * CHAR_WIDTH + 0.5) + PADDING
    box_height = TITLE_HEIGHT + tallest * LINE_HEIGHT + PADDING

    grid_x = MARGIN
    grid_y = GRID_TOP
    grid_width = box_width * 2
    grid_height = box_height * 2
    total_width = grid_width + MARGIN * 2
    total_height = grid_y + grid_height + MARGIN

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_width} {total_height}" style="font-family: 'Courier New', monospace; font-size: 14px;">
  <defs>
    <style>
      .title {{ font-size: 18px; font-weight: bold; fill: {colors['title_color']}; }}
      .format-title {{ font-size: 16px; font-weight: bold; fill: {colors['title_color']}; }}
      .line-number {{ fill: {colors['line_num_color']}; }}
      .border {{ fill: none; stroke: {colors['border_color']}; stroke-width: 2; }}
      .border-line {{ stroke: {colors['border_color']}; stroke-width: 2; }}
      .bg {{ fill: {colors['bg_color']}; }}
    </style>
  </defs>

  <rect x="0" y="0" width="{total_width}" height="{total_height}" class="bg"/>

  <text x="{total_width // 2}" y="30" text-anchor="middle" class="title">Format Comparison: LiNo, YAML, JSON, XML</text>

'''

    svg += f'  <rect x="{grid_x}" y="{grid_y}" width="{grid_width}" height="{grid_height}" class="border"/>\n'
    svg += (f'  <line x1="{grid_x + box_width}" y1="{grid_y}" '
            f'x2="{grid_x + box_width}" y2="{grid_y + grid_height}" class="border-line"/>\n')
    svg += (f'  <line x1="{grid_x}" y1="{grid_y + box_height}" '
            f'x2="{grid_x + grid_width}" y2="{grid_y + box_height}" class="border-line"/>\n')
    svg += '\n'

    for index, (format_name, lines, highlighter) in enumerate(boxes):
        box_x = grid_x + (index % 2) * box_width
        box_y = grid_y + (index // 2) * box_height

        svg += (f'  <text x="{box_x + box_width // 2}" y="{box_y + 25}" '
                f'text-anchor="middle" class="format-title">{format_name}</text>\n\n')

        for i, line in enumerate(lines):
            y = box_y + TITLE_HEIGHT + (i * LINE_HEIGHT)

            svg += '  <text class="line-number">\n'
            svg += f'    <tspan x="{box_x + PADDING}" y="{y}">{i + 1}</tspan>\n'
            svg += '  </text>\n'

            svg += '  <text xml:space="preserve">\n'
            svg += f'    {render_line(highlighter(line, colors), box_x + GUTTER, y)}\n'
            svg += '  </text>\n\n'

    return svg + '</svg>\n'


def main(argv):
    check = '--check' in argv[1:]
    stale = []

    for theme, filename in THEMES.items():
        svg = create_svg_comparison(theme)
        path = HERE / filename
        if check:
            current = path.read_text(encoding='utf-8') if path.exists() else None
            if current != svg:
                stale.append(filename)
            continue
        path.write_text(svg, encoding='utf-8')
        print(f'Wrote {path.relative_to(HERE.parent.parent)}')

    if check:
        if stale:
            print('Out of date, run generate_comparison_svgs.py: ' + ', '.join(stale))
            return 1
        print('The committed comparison SVGs match the documents')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
