# Symbol Seeker (vscode-symbol-seeker)

A simple VSCode Extension, that allows fast fuzzy search for symbols & files of the current workspace -- all in the same interface!

It archives that by creating, parsing, caching & searching [ctags](https://ctags.io) for the current workspace. If you assign a shortcut you will find your files even faster!

_This is a heavy Work-In-Progress! May not work for your usecase!_ 

## Features

- Search for Files & Symbols across the whole project with one command: `Search for Symbol or File`
- Support for all langauges, [that ctags support](https://github.com/universal-ctags/ctags/tree/master/parsers)
- Additional (basic) Support for Dart
- Weighted fuzzy-search to prefer e.g. _file_-result over _property_-results 
- Use `.extension` in your search to only show files with that exact extension
- Use `/file/path` in your search to only show files with a fuzzy matching path

## Requirements

- Universal CTags (e.g. `brew install universal-ctags`)

_Please make sure the `ctags`-executable is in your PATH-Variable_

## Changelog

Please take a look at the [CHANGELOG.md](CHANGELOG.md) File.

## Extension Settings

_See `package.json` for a list of settings & and there defaults_

## ToDos & Improvements:
- Add _not found_-Options e.g. do a full-text-search, search git history, etc.
- Add more user facing errors: e.g. CTags is not installed, No Workspace is opened, etc.
- Add Tests
- Improve Matching for paths pasted in search bar
- Support multiple workspaces