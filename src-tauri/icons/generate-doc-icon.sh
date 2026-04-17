#!/bin/bash
# Generate the document type icon from the app icon.
# Usage: ./generate-doc-icon.sh
# Requires: ImageMagick 7 (magick)

DIR="$(cd "$(dirname "$0")" && pwd)"
ICON="$DIR/icon.png"
OUT="$DIR/doc-icon.png"

# White rounded page with app icon centered (rounded corners), square canvas
magick -size 512x512 xc:none \
  \( -size 340x440 xc:white -alpha set \
     \( -size 340x440 xc:none -fill white -draw "roundrectangle 0,0 339,439 16,16" \) \
     -compose CopyOpacity -composite \
  \) -gravity center -composite \
  \( "$ICON" -resize 180x180 \
     \( -size 180x180 xc:none -fill white -draw "roundrectangle 0,0 179,179 28,28" \) \
     -compose CopyOpacity -composite \
  \) -gravity center -geometry +0-10 -composite \
  "$OUT"

echo "Generated $OUT"
