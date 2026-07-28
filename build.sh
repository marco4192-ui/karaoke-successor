#!/bin/bash
cd "$(dirname "$0")"
./node_modules/.bin/next build 2>&1
