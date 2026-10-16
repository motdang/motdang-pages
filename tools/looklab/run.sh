#!/bin/zsh
# run.sh [looks|all] [kinds|all] — every look with every kind as a real page, shot at phone size and
# laid side by side in one picture (Nan 2026-10-16). Needs `npm run dev` (or LAB_ORIGIN for another
# port). The sheet lands in notes/screens/; the lab pages are removed before this ends.
set -e
cd "${0:A:h}/../.."
looks=${1:-all}; kinds=${2:-all}
shots=$(mktemp -d)
node tools/looklab/lab.mjs "$looks" "$kinds"
trap 'rm -rf public/s/lab' EXIT
node tools/looklab/shoot.mjs "$shots" "$looks" "$kinds"
L=$(node -e "import('./public/s/render.mjs').then(m=>console.log('$looks'==='all'?m.LOOK_IDS.join(','):'$looks'))")
K=$(node -e "import('./public/s/render.mjs').then(m=>console.log('$kinds'==='all'?m.KINDS.join(','):'$kinds'))")
out="notes/screens/looklab-$(date +%Y%m%d-%H%M).png"
python3 tools/looklab/sheet.py "$shots" "$out" "$L" "$K" 0.4
echo "$out"
