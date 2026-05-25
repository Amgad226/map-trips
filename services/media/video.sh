#!/bin/bash

set -e

# ---------------- INPUT ----------------
read -p "Input video [input.mp4]: " input
input=${input:-input.mp4}

if [ ! -f "$input" ]; then
  echo "File not found: $input"
  exit 1
fi

# ---------------- DURATION ----------------
duration=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 "$input")
duration=${duration%.*}

echo "Video duration: ${duration}s"

# ---------------- CUT ----------------
read -p "Cut FIRST seconds: " start_cut
start_cut=${start_cut:-0}

read -p "Cut LAST seconds: " end_cut
end_cut=${end_cut:-0}

end_time=$((duration - end_cut))

if [ "$end_time" -le "$start_cut" ]; then
  echo "Invalid cut range"
  exit 1
fi

# ---------------- ROTATION ----------------
echo "Rotation:"
echo "1) No rotation"
echo "2) 90° clockwise"
echo "3) 90° counterclockwise"
echo "4) 180°"
read -p "Choice: " rot

case $rot in
  1) vf="" ;;
  2) vf="transpose=1" ;;
  3) vf="transpose=2" ;;
  4) vf="transpose=2,transpose=2" ;;
  *) vf="" ;;
esac

# ---------------- OUTPUT ----------------
read -p "Output file [output.mp4]: " output
output=${output:-output.mp4}

# ---------------- COMPRESSION ----------------
read -p "Do you want compression? (y/n): " compress

if [ "$compress" = "y" ]; then
  echo "Compression level (quality %):"
  echo "90 | 70 | 50 | 20"
  read -p "Choose: " quality
  quality=${quality:-70}

  if [ "$quality" -ge 80 ]; then
    CRF=18; CQ=18
  elif [ "$quality" -ge 60 ]; then
    CRF=20; CQ=20
  elif [ "$quality" -ge 40 ]; then
    CRF=23; CQ=23
  else
    CRF=28; CQ=28
  fi
fi

# ---------------- GPU DETECTION ----------------
USE_GPU=0
if ffmpeg -encoders | grep -q h264_nvenc && nvidia-smi >/dev/null 2>&1; then
  USE_GPU=1
  echo "GPU detected → NVENC enabled"
else
  echo "CPU mode"
fi

# ---------------- FILTER ----------------
FILTER=""
if [ -n "$vf" ]; then
  FILTER="-vf $vf"
fi

# ---------------- ENCODING (FIXED LOGIC) ----------------

REENCODE=0

# if rotation/filter exists → must re-encode
if [ -n "$vf" ]; then
  REENCODE=1
fi

if [ "$compress" = "y" ]; then
  REENCODE=1
fi

if [ "$REENCODE" -eq 0 ]; then
  # LOSSLESS STREAM COPY (original quality)
  CODEC="-c copy"
else
  # LOSSLESS / HIGH QUALITY ENCODE (NOT compression mode)
  if [ "$USE_GPU" -eq 1 ] && [ "$compress" = "y" ]; then
    CODEC="-c:v h264_nvenc -preset p1 -cq 18 -c:a copy"
  else
    # IMPORTANT: if not compressing, use VERY high quality (visually lossless)
    if [ "$compress" = "n" ]; then
      CODEC="-c:v libx264 -preset veryfast -crf 18 -c:a copy"
    else
      CODEC="-c:v libx264 -preset veryfast -crf $CRF -c:a copy"
    fi
  fi
fi

# ---------------- RUN ----------------
echo ""
echo "Processing..."
echo "----------------------------"

ffmpeg -y \
  -i "$input" \
  -ss "$start_cut" \
  -to "$end_time" \
  $FILTER \
  $CODEC \
  -hide_banner -loglevel error -stats \
  "$output"

# ---------------- SIZE REPORT ----------------
in_size=$(du -m "$input" | cut -f1)
out_size=$(du -m "$output" | cut -f1)

echo ""
echo "=============================="
echo "Input size : ${in_size} MB"
echo "Output size: ${out_size} MB"
echo "Compression: $compress"
echo "Quality    : ${quality:-N/A}%"
echo "GPU mode   : $USE_GPU"
echo "Saved to   : $output"
echo "=============================="
