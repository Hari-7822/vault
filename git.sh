#!/bin/bash
git add . && git commit -m $1 && git switch $2 && git pull origin $2 && git push origin $2