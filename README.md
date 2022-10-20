# Symbol Seeker (vscode-symbol-seeker)

A simple VSCode Extension, that allows fast fuzzy search for symbols & files of the current workspace -- all in the same interface!

It archives that by creating, parsing, caching & searching [cTags](https://cTags.io) for the current workspace. If you assign a shortcut you will find your files even faster!

_This is a heavy Work-In-Progress! May not work for your usecase!_ 

## Features

- Search for Files & Symbols across the whole project with one command: `Search for Symbol or File`
  - Including support for multi folder workspaces
- Support many programming languages
  - More specifically for all languages [that cTags support](https://github.com/universal-cTags/cTags/tree/master/parsers)
  - Additional (basic) Support for Dart
- Weighted fuzzy-search. E.g.:
  - _file_-results are preferred over _property_-results 
  - Results in the current file are preferred over others
- Special commands:
  - Use `.extension` in your search to only show files with that exact extension
  - Use `/file/path` in your search to only show files with a fuzzy matching path
  - Use `$filename` in your search to only show files with a prefix-matching filename

## Requirements

- A unix machine. Windows is untested and will most likely **not** work!
- Universal CTags (e.g. `brew install universal-cTags`)

_Please make sure the `cTags`-executable is in your PATH-Variable_

## Changelog

Please take a look at the [CHANGELOG.md](CHANGELOG.md) File.

## Extension Settings

_See `package.json` for a list of settings & and their defaults_

## ToDos & Improvements:
- Add _not found_-Options e.g. do a full-text-search, search git history, etc.
- Add more user facing errors: e.g. CTags is not installed, No Workspace is opened, etc.
- Add Tests
- Improve Matching for paths pasted in search bar
- Resolve the TODOs in the source code
- Add Windows support