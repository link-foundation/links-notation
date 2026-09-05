#!/bin/bash

# Script to generate PNG files from SVG comparison images
# This script requires either ImageMagick (convert), Inkscape, or rsvg-convert

SVG_FILES=("comparison.svg" "comparison-light.svg" "comparison-dark.svg")

# Function to convert a single SVG to PNG
convert_svg_to_png() {
    local SVG_FILE="$1"
    local PNG_FILE="${SVG_FILE%.svg}.png"

    # Check if SVG file exists
    if [ ! -f "$SVG_FILE" ]; then
        echo "Warning: $SVG_FILE not found, skipping..."
        return 1
    fi

    # Try different conversion tools in order of preference
    if command -v inkscape &> /dev/null; then
        echo "Using Inkscape to convert $SVG_FILE to PNG..."
        inkscape "$SVG_FILE" --export-filename="$PNG_FILE" --export-dpi=150
    elif command -v rsvg-convert &> /dev/null; then
        echo "Using rsvg-convert to convert $SVG_FILE to PNG..."
        # --zoom keeps the aspect ratio, so the picture cannot be stretched
        # when the generator resizes the grid to fit a longer example.
        rsvg-convert --zoom 2 "$SVG_FILE" -o "$PNG_FILE"
    elif command -v convert &> /dev/null; then
        echo "Using ImageMagick to convert $SVG_FILE to PNG..."
        if [[ "$SVG_FILE" == *"dark"* ]]; then
            convert -density 150 -background black "$SVG_FILE" "$PNG_FILE"
        else
            convert -density 150 -background white "$SVG_FILE" "$PNG_FILE"
        fi
    else
        echo "Error: No SVG conversion tool found!"
        echo "Please install one of the following:"
        echo "  - Inkscape: sudo apt-get install inkscape"
        echo "  - librsvg: sudo apt-get install librsvg2-bin"
        echo "  - ImageMagick: sudo apt-get install imagemagick"
        return 2
    fi

    # Check if PNG was created successfully
    if [ -f "$PNG_FILE" ]; then
        echo "Success! Generated: $PNG_FILE"
        ls -lh "$PNG_FILE"
        return 0
    else
        echo "Error: PNG file was not created!"
        return 1
    fi
}

# Main conversion loop
echo "Converting all SVG comparison images to PNG..."
echo "=============================================="

CONVERSION_TOOL_FOUND=0
for SVG_FILE in "${SVG_FILES[@]}"; do
    convert_svg_to_png "$SVG_FILE"
    RESULT=$?
    if [ $RESULT -eq 2 ]; then
        exit 1
    fi
    if [ $RESULT -eq 0 ]; then
        CONVERSION_TOOL_FOUND=1
    fi
done

if [ $CONVERSION_TOOL_FOUND -eq 0 ]; then
    echo "Error: No PNG files were created!"
    exit 1
fi

echo ""
echo "=============================================="
echo "All conversions complete!"
