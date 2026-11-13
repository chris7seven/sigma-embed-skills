#!/bin/bash
# List every place the previous prospect's vocabulary still appears in a demo folder.
#   bash find-leftovers.sh "<demo folder>" "Anvilogic|Kestrel|SOC|Riley|Dana|Splunk"
# Skips node_modules, dist, generated data and build output. Exit code 1 if anything is found.
DIR="$1"; PAT="${2:-Anvilogic|Kestrel|Riley|Dana Ortiz}"
grep -rnE "$PAT" "$DIR" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=out --exclude-dir=generated --exclude-dir=__pycache__ \
  --exclude=package-lock.json --exclude='*.png' | sed "s#^$DIR/##" | awk -F: '{c[$1]++} END {for (f in c) printf "%5d  %s\n", c[f], f}' | sort -rn
grep -rqE "$PAT" "$DIR" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=out --exclude-dir=generated --exclude-dir=__pycache__ --exclude=package-lock.json && exit 1 || exit 0
