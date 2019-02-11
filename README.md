# GnuPG Tool

![GnuPG Tool logo](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/vscode-gnupg-tool-logo.png)

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
![Installs](https://vsmarketplacebadge.apphb.com/installs-short/JHeilingbrunner.vscode-gnupg-tool.svg)
![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/JHeilingbrunner.vscode-gnupg-tool.svg)

![Encrypt-Decrypt-Smartcard](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/Encrypt-Decrypt.gif)

## Features

- Check GnuPG availability/version.
- Encryption for multiple recipients.
- Passphrase/Pin entry __only__ into original GnuPG dialog. __Not through__ Visual Studio Code or something else.
- End session by killing gpg-agent.
- Works with smartcards.

## Used References

- [VSCode GPG extension](https://marketplace.visualstudio.com/items?itemName=jvalecillos.gpg) by Jose Valecillos
- [node-gpg](https://github.com/drudge/node-gpg) by Nicholas Penree
- [GnuPG](https://www.gnupg.org/documentation/manuals/gnupg/index.html#SEC_Contents) documentation
- [gpg](https://git.gnupg.org/cgi-bin/gitweb.cgi?p=gnupg.git;a=blob_plain;f=doc/DETAILS) details

## Usage

### Check GnuPG

1. Select command `GnuPG Tool: Check GnuPG`
2. Info message will show version numbers

### List Recipients

1. Select command `GnuPG Tool: List Recipients`

Output:

- fingerprint
- name
- email
- capability D:disabled, S:sign, C:certify, E:encrypt
- validity

### Encrypt

1. Select text in editor
2. Select command `GnuPG Tool: Encrypt Selection`
3. Select recipients with checkboxes
4. Press `OK` button

### Decrypt

1. Select text in editor
2. Select command `GnuPG Tool: Decrypt Selection`

### End Session

1. Select command `GnuPG Tool: End Session`


> Mac/OSX: This works on Mac/OSX only if password is __not__ stored in macOS key ring. Check `System settings/GPG Suite`.

## Requirements

### Installation of GnuPG

#### Windows

- Use pure [__GnuPG__](https://www.gnupg.org/ftp/gcrypt/binary/) installation (`gnupg-w32-<version>_<date>.exe`)
- or [__Gpg4win__](https://www.gpg4win.de/)

#### OSX/Debian

- Refer to [GnuPG binary releases](https://gnupg.org/download/)

## Release Notes

## 0.0.5

- Encryption only for enabled, capable [E] recipients

## 0.0.4

README.md

### 0.0.3

End session command `gpgconf --kill gpg-agent` replaced with `gpg-connect-agent killagent /bye`

### 0.0.2

Validity in recipient information.

### 0.0.1

Initial release.
