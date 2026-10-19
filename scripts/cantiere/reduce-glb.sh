#!/bin/sh
# Capi 3D del cantiere: da media-sorgenti/cantiere/<capo>-sam3d.glb (Higgsfield SAM 3D, ~1,6 MB e
# ~25 000 triangoli) a public/cantiere/capi/<capo>.glb (~120 KB, ~4 000 triangoli, texture WebP 1024).
#   sh scripts/cantiere/reduce-glb.sh
set -e
cd "$(dirname "$0")/../.."
mkdir -p public/cantiere/capi
T=$(mktemp -d)
for f in media-sorgenti/cantiere/*-sam3d.glb; do
  n=$(basename "$f" -sam3d.glb)
  npx gltf-transform simplify "$f" "$T/$n-s.glb" --ratio 0.15 --error 0.01 > /dev/null
  npx gltf-transform resize "$T/$n-s.glb" "$T/$n-r.glb" --width 1024 --height 1024 > /dev/null
  npx gltf-transform webp "$T/$n-r.glb" "public/cantiere/capi/$n.glb" > /dev/null
  echo "$n: $(wc -c < "public/cantiere/capi/$n.glb") byte"
done
rm -rf "$T"
