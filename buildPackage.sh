#!/bin/sh

set -eux


rm -rf compiled/
rm -rf dist/
yarn jest
yarn tsc -p .
yarn run ef-tspm
cp -r compiled/lib/ dist/
cp package.json dist/
cp LICENSE-MIT.txt dist/
cp LICENSE-APACHE.txt dist/
cp README.md dist/
cd dist/
npm pack
