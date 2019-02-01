# How to create & minimize VSIX package

## Create VSIX

- run `vsce package` in root folder

## Minimize VSIX

- rename `*.vsix` to `*.zip`
- open zip file with explorer
- delete directories `./src`, `./out`, `./.vscode`
- delete unused images. Leave `vscode-gnupg-tool-logo.png` in `./images` folder.
- rename `*.zip` to `*.vsix` back again
