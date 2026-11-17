#!/bin/bash
# R66 verification helper: (re)start the dev server and wait until it answers.
# The sandbox reaps background processes between Bash invocations, so every
# verification call boots the server itself (Next .next cache keeps it fast).
cd /home/z/my-project || exit 1
pkill -f "tsx server.ts" 2>/dev/null
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1
rm -f dev.log
bun run dev > dev.log 2>&1 &
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then echo "SERVER READY"; exit 0; fi
  sleep 1
done
echo "SERVER FAILED TO START"; tail -25 dev.log; exit 1
