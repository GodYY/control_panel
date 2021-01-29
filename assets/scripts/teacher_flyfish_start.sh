#!/bin/sh

cd /Users/yangyang/go/src/github.com/sniperHW/flyfish
go run ./kvnode/main/kvserver.go --config ./config/config.toml teacher_flyfish_node > /dev/null 2>&1 &
