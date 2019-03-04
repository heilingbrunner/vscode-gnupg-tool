# GnuPG Tool

![GnuPG Tool logo](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/vscode-gnupg-tool-logo.png)

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
[![Build Status](https://travis-ci.org/heilingbrunner/vscode-gnupg-tool.svg?branch=master)](https://travis-ci.org/heilingbrunner/vscode-gnupg-tool)
![Installs](https://vsmarketplacebadge.apphb.com/installs-short/JHeilingbrunner.vscode-gnupg-tool.svg)
![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/JHeilingbrunner.vscode-gnupg-tool.svg)

![Decrypt-Selection](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/decryptselection.gif)

## Features

- Check GnuPG availability/version.
- Encryption for multiple recipients or with simple passphrase
- Encrypt/decrypt text selection or file to text, file or preview
- Passphrase/Pin entry __only__ into original GnuPG dialog. __Not through__ Visual Studio Code or something else.
- End session to reset password cache by killing gpg-agent.
- Works with smartcards.
- Sign/verify file.
- Keys import/export.

The command palette ...

![Command palette](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/command-palette.png)

The explorer context menu ...

![Explorer context menu](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/explorer-context-menu.png)

The editor context menu ...

![Editor context menu](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/editor-context-menu.png)

## Used References

- [VSCode GPG extension](https://marketplace.visualstudio.com/items?itemName=jvalecillos.gpg) by Jose Valecillos
- [node-gpg](https://github.com/drudge/node-gpg) by Nicholas Penree
- [GNU Privacy Guard](https://en.wikipedia.org/wiki/GNU_Privacy_Guard)
- [GnuPG](https://www.gnupg.org/documentation/manuals/gnupg/index.html#SEC_Contents) documentation

## Usage

### Used File extensions

#### The `*.asc` Files

- `<filename>.<ext>.asc`: This should be an ascii encrypted file (option: `--armor`) of the `<filename>.<ext>` file.
- It although can be an ascii encoded key file.

#### The `*.sig` Files

- `<filename>.<ext>.sig`: This should be an ascii encoded signature file corresponding to `<filename>.<ext>`.

## Requirements

### GnuPG

#### Windows

- Use pure [__GnuPG__](https://www.gnupg.org/ftp/gcrypt/binary/) installation (`gnupg-w32-<version>_<date>.exe`)
- or [__Gpg4win__](https://www.gpg4win.de/)

#### OSX

- [GPG Suite](https://gpgtools.org/)

#### Debian

- Refer to [GnuPG binary releases](https://gnupg.org/download/)

## Used GnuPG Commands

- Check GnuPG: `gpg --version` (using [gpg call](https://github.com/drudge/node-gpg))
- List Public Keys: `gpg -k --with-colons` (using [gpg call](https://github.com/drudge/node-gpg))
- List Secret Keys: `gpg -K --with-colons` (using [gpg call](https://github.com/drudge/node-gpg))
- Show Smartcard: `gpg --card-status`  (using [gpg call](https://github.com/drudge/node-gpg))
- Encrypt text selection: `gpg --armor --recipient <fingerprint> --encrypt` from stdin to stdout (using [gpg encrypt](https://github.com/drudge/node-gpg))
- Encrypt file for recipients: `gpg --armor --batch --yes --recipient <fingerprint> --output <filename>.<ext>.asc --encrypt <filename>.<ext>`
- Encrypt file with passphrase: `gpg --armor --batch --yes --output <filename>.<ext>.asc --symmetric <filename>.<ext>`
- Decrypt: `gpg --decrypt` from stdin to stdout (using [gpg decrypt](https://github.com/drudge/node-gpg))
- End session: `gpg-connect-agent killagent /bye`
- Sign File: `gpg --armor --output <filename>.<ext>.sig --local-user <ssb.fingerprint> --detach-sign <filename>.<ext>` (using [gpg call](https://github.com/drudge/node-gpg))
- Verify File: `gpg --verify <filename>.<ext>.sig <filename>.<ext> 2>&1` (using `child_process.exec(...)`)
- Import Keys: `gpg --import <filename>.<ext>`
- Export Public Keys: `gpg --armor --batch --yes --output <filename>.<ext> --export <fingerprint>`
- Export Secret Keys: `gpg --armor --batch --yes --output <filename>.<ext>--export-secret-keys <fingerprint>`
- Export Secret Sub Keys: `gpg --armor --batch --yes --output <filename>.<ext>--export-secret-subkeys <fingerprint>`

## Release Notes

## 1.0.0

- verify using npm.gpg.call(...)

## 0.0.10

- using better npm.gpg ...stream/...ToFile functions

## 0.0.9

- encryption with passphrase

## 0.0.8

- import/export of public/private keys

## 0.0.7

- ShowOpenDialog() instead of several info messages 'GnuPG: No file selected ! Please use explorer context menu.'

## 0.0.6

- filter keys for sign and encrypt file

## 0.0.5

- Encryption only for enabled, capable [E] and valid recipients
- Previews
- Context menus
- Smartcard details
- GnuPG version
- Statusbar item with GnuPG version
- Sign/verify

## 0.0.4

README

### 0.0.3

End session command `gpgconf --kill gpg-agent` replaced with `gpg-connect-agent killagent /bye`

### 0.0.2

Validity in recipient information.

### 0.0.1

Initial release.
