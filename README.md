# Symbol Seeker (vscode-symbol-seeker)

A simple VSCode Extension, that uses creates & parses ctags for the current workspace to allow an improved search experience when looking for symbols and files.

## Features

- Search for Files & Symbols across the whole project with one command
- Support for as many langauges as ctags support

## Requirements

- Universal CTags (e.g. `brew install universal-ctags`)

_Please make sure the `ctags`-executable is in your PATH-Variable_

## Extension Settings

_No Settings as of now_

## ToDos & Improvements:
- At search-weights, e.g. higher position for symbols of the current file
- Add a special syntax/keywords to limit your search to a folder or file-extension
- Add _not found_-Options e.g. do a full-text-search, search git history, etc.