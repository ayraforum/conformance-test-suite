#!/usr/bin/env sh

docker run -it --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -p 5001:5001 \
    -p 3000:3000 \
    -p 5003:5003 \
    cts-dev
