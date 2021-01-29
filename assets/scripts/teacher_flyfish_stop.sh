#!/bin/sh

ps | grep "teacher_flyfish_node" | grep -v "grep" | awk '{print $1}' | xargs kill -KILL
echo "teacher-flyfish stop."