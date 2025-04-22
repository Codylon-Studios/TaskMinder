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

for filePath in src/scss/*.scss; do
  fileName=$(basename "$filePath")
  fileName="${fileName%.*}"
  case "$fileName" in
    _*) continue ;;
    *)  if [ "$watch" = true ]; then
          sass -w "$filePath" "public/${fileName}/${fileName}.css" &
        else
          sass "$filePath" "public/${fileName}/${fileName}.css"
        fi
        ;;
    esac
done

for filePath in src/scss/templates/*.scss; do
  fileName=$(basename "$filePath")
  fileName="${fileName%.*}"
  if [ "$watch" = true ]; then
    sass -w "$filePath" "public/templates/${fileName}.css" &
  else
    sass "$filePath" "public/templates/${fileName}.css"
  fi
done
