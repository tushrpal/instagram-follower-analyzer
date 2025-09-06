#!/bin/bash
export NODE_OPTIONS=--max_old_space_size=2048
npm ci
npm run build
