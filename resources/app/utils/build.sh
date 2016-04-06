#!/bin/bash

echo "Leaving $(pwd)"
pushd . && cd ~/dev/clojure/web/pando/resources/app/scripts/
echo ""
echo "In $(pwd): Building files"
~/bin/node-v5.4.0-linux-x64/bin/browserify main.js -o main.min.js
# ~/bin/node-v5.4.0-linux-x64/bin/minify main.tmp.js > main.min.js
popd
echo ""
echo "returned to $(pwd)"
