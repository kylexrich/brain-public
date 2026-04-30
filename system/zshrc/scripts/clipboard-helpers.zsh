copyDir() {
  if [[ $# -lt 1 || $# -gt 2 ]]; then
    echo "Usage: copyDir <directory> [strip-ts-headers:true|false]"
    return 1
  fi

  local src="${1%/}"
  if [[ ! -d $src ]]; then
    echo "Error: '$src' is not a directory."
    return 1
  fi

  # Optional second argument: enable stripping for TS files?
  local strip_ts="${2:-false}"
  case "$strip_ts" in
    true|1|yes|y|Y) strip_ts=true ;;
    *) strip_ts=false ;;
  esac

  # Decide clipboard command
  local -a copy_cmd
  if command -v pbcopy &>/dev/null; then
    copy_cmd=(pbcopy)
  elif command -v xclip &>/dev/null; then
    copy_cmd=(xclip -selection clipboard)
  else
    echo "Error: install pbcopy (macOS) or xclip (Linux) to use this."
    return 1
  fi

  find "$src" -type f -print0 |
    while IFS= read -r -d '' file; do
      printf '# %s\n\n' "$file"

      if [[ $strip_ts == true ]]; then
        case "$file" in
          *.ts|*.tsx)
            awk '
              BEGIN {
                inHeader = 1
                inBlockComment = 0
              }
              {
                if (!inHeader) {
                  print
                  next
                }

                line = $0

                if (inBlockComment) {
                  if (line ~ /\*\//) {
                    inBlockComment = 0
                  }
                  next
                }

                # skip empty lines
                if (line ~ /^[[:space:]]*$/) next

                # skip block comments at top of file
                if (line ~ /^[[:space:]]*\/\*/) {
                  if (line !~ /\*\//) {
                    inBlockComment = 1
                  }
                  next
                }

                # skip single-line comments
                if (line ~ /^[[:space:]]*\/\//) next

                # skip import statements
                if (line ~ /^[[:space:]]*import[[:space:]]/) next

                # first non-comment, non-import line: print and end header mode
                inHeader = 0
                print line
              }
            ' "$file"
            ;;
          *)
            cat "$file"
            ;;
        esac
      else
        cat "$file"
      fi

      printf '\n'
    done | "${copy_cmd[@]}"

  echo "✅ All file contents from '$src' (with full paths) copied to clipboard."
}


copyTree() {
  if [[ $# -ne 2 ]]; then
    echo "Usage: copyTree <directory> <string>"
    return 1
  fi

  local dir=$1
  local txt=$2

  if [[ ! -d "$dir" ]]; then
    echo "Error: '$dir' is not a directory."
    return 1
  fi

  # Generate a relative file list with root dir prefixed, append the text, and copy to clipboard
  (
    cd "$dir" || exit 1
    root="$(basename "$PWD")"
    find . -type f | sed 's|^\./||' | while IFS= read -r file; do
      echo "$root/$file"
      echo "$txt"           # If you prefer the old 2-space indent, use: echo "  $txt"
    done
  ) | pbcopy

  echo "✅ Formatted list copied to clipboard."
}

copyTreeDir() {
    if [[ $# -ne 2 ]]; then
      echo "Usage: copyTreeDir <directory>
  <string>"
      return 1
    fi

    local dir="$1"
    local txt="$2"

    if [[ ! -d "$dir" ]]; then
      echo "Error: '$dir' is not a directory."
      return 1
    fi

    {
      cd "$dir" || return 1
      local root="$(basename "$PWD")"
      echo "$root/"
      echo "$txt"
      find . -type d ! -path . | sed 's|^\./||' |
   sort | while IFS= read -r subdir; do
        echo "$root/$subdir/"
        echo "$txt"
      done
    } | pbcopy

    echo "✅ Formatted directory list copied to
  clipboard."
  }
