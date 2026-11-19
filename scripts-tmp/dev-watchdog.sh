#!/bin/bash
# R84: keep the dev server alive across sandbox process reaping.
cd /home/z/my-project
while true; do
  if ! curl -s -o /dev/null --max-time 4 http://localhost:3000/ 2>/dev/null; then
    if pgrep -f "bun run dev" > /dev/null 2>&1 || pgrep -f "next-server" > /dev/null 2>&1; then
      # process exists but not answering — wait a bit more (compiling)
      sleep 6
      if ! curl -s -o /dev/null --max-time 4 http://localhost:3000/ 2>/dev/null; then
        pkill -f "bun run dev" 2>/dev/null
        pkill -f "next dev" 2>/dev/null
        sleep 2
        nohup bun run dev >> dev.log 2>&1 &
      fi
    else
      nohup bun run dev >> dev.log 2>&1 &
    fi
  fi
  sleep 5
done
