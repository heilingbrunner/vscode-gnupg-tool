# GnuPG Tool

![GnuPG Tool logo](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/vscode-gnupg-tool-logo.png)

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
[![Build Status](https://travis-ci.org/heilingbrunner/vscode-gnupg-tool.svg?branch=master)](https://travis-ci.org/heilingbrunner/vscode-gnupg-tool)
![Installs](https://vsmarketplacebadge.apphb.com/installs-short/JHeilingbrunner.vscode-gnupg-tool.svg)
![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/JHeilingbrunner.vscode-gnupg-tool.svg)

## Features

- __Check__ GnuPG availability/version.
- Encryption for multiple __recipients__ or with simple __passphrase__
- __Encrypt__/__decrypt__ text or file to text, file or preview
- Passphrase/Pin entry __only__ into original GnuPG __Pinentry__ dialog. Not through Visual Studio Code or something else.
- End session to reset password cache by __killing gpg-agent__.
- Works with __smartcards__.
- __Sign__/__verify__ file.
- Keys __import__/__export__.

## Supported locales

The extension is available in multiple languages (Google Translator):

- `de`
- `en`
- `es`
- `fr`
- `ru`
- `zh-CN`

![Decrypt-Selection](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/decryptselection.gif)

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
