#!/bin/sh

watch=false

for arg in $@; do
  case "$arg" in
    -h|--help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  -h, --help    Show this help message"
      echo "  -w, --watch   Watch stylesheets and recompile when they change."
      exit 0
      ;;
    -w|--watch)
      watch=true
      ;;
    *)
      echo "Unknown option: $arg"
      exit 1
      ;;
  esac
done

for filePath in src/sass/*; do
  fileName=$(basename "$filePath")
  fileName="${fileName%.*}"
  case "$fileName" in
    _*) continue ;;
    *)  if [ "$watch" = true ]; then
          sass -w -q --quiet-deps "$filePath" "public/${fileName}/${fileName}.css" &
        else
          sass -q --quiet-deps "$filePath" "public/${fileName}/${fileName}.css"
        fi
        ;;
    esac
done
