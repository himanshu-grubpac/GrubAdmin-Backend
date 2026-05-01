#!/bin/sh
set -e

bun db:push
bun db:generate
exec bun start