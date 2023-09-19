#!/bin/bash

# Specify the top-level directories where you want to start compilation
directories=("classes" "common" "core" "decorators" "packages" "utilities")

# Loop through the directories and run tsc for each one
for dir in "${directories[@]}"; do
  echo "Compiling TypeScript in $dir"
  find "$dir" -type f -name '*.ts' -exec tsc -b -v {} +
done

