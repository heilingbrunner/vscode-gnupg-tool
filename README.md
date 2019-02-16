# GnuPG Tool

![GnuPG Tool logo](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/vscode-gnupg-tool-logo.png)

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
![Installs](https://vsmarketplacebadge.apphb.com/installs-short/JHeilingbrunner.vscode-gnupg-tool.svg)
![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/JHeilingbrunner.vscode-gnupg-tool.svg)

![Decrypt-Selection](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/decryptselection.gif)

## Features

- Check GnuPG availability/version.
- Encryption for multiple recipients.
- Encrypt/decrypt text selection or file to text, file or preview
- Passphrase/Pin entry __only__ into original GnuPG dialog. __Not through__ Visual Studio Code or something else.
- End session to reset password cache by killing gpg-agent.
- Works with smartcards.
- Sign/verify file.

## Used References

- [VSCode GPG extension](https://marketplace.visualstudio.com/items?itemName=jvalecillos.gpg) by Jose Valecillos
- [node-gpg](https://github.com/drudge/node-gpg) by Nicholas Penree
- [GnuPG](https://www.gnupg.org/documentation/manuals/gnupg/index.html#SEC_Contents) documentation
- [gpg](https://git.gnupg.org/cgi-bin/gitweb.cgi?p=gnupg.git;a=blob_plain;f=doc/DETAILS) details

## Usage

### Check GnuPG

1. Select command `GnuPG: Check GnuPG`

Details will be shown in a virtual document.

### List Public Keys

1. Select command `GnuPG: List Public Keys`

Details will be shown in a virtual document.

- fingerprint
- name
- email
- capability D:disabled, S:sign, C:certify, E:encrypt
- validity

### List Private Keys

1. Select command `GnuPG: List Private Keys`

Details will be shown in a virtual document.

- fingerprint
- name
- email
- capability D:disabled, S:sign, C:certify, E:encrypt
- validity

### Show Smartcard

1. Select command `GnuPG: Show Smatcard`

Details will be shown in a virtual document.

### Encrypt Selection

1. Select text in editor
2. Select command `GnuPG: Encrypt Selection` or open context menu in editor
3. Select recipients with checkboxes
4. Press `OK` button

### Encrypt File

1. Select file in VSCode explorer
2. Select `Encrypt File` from context menu

A new encrypted file (`<filename>.<ext>.asc`) will be generated.

### Preview Encrypted File

1. Select file in VSCode explorer
2. Select `Preview Encrypted File` from context menu

The encrypted file will be shown in a virtual document.

### Decrypt Selection

1. Select text in editor
2. Select command `GnuPG: Decrypt Selection` or open context menu in editor
3. Enter passphrase if required

The selected text will be replaced by decrypted text.

### Decrypt File

1. Select file in VSCode explorer
2. Select `Decrypt File` from context menu

A new decrypted file (`<filename>.<ext>.decrypted`) will be generated.

### Preview Decrypted File

1. Select file in VSCode explorer
2. Select `Preview Decrypted File` from context menu

The decrypted file will be shown in a virtual document. __This is intended for encrypted files, which only should be temporary opened.__

### Sign File

1. Select file in VSCode explorer
2. Select `Sign File` from context menu
3. Select signer from quick pick list

This will generate/overwrite a additional `<filename>.<ext>.sig` file.

### Verify File

1. Select file in VSCode explorer
2. Select `Verify File` from context menu

This will show the verification result in a virtual document.

### End Session

1. Select command `GnuPG: End Session`

> Mac/OSX: This works on Mac/OSX only if password is __not__ stored in macOS key ring. Check `System settings/GPG Suite`.

## Requirements

### Installation of GnuPG

#### Windows

- Use pure [__GnuPG__](https://www.gnupg.org/ftp/gcrypt/binary/) installation (`gnupg-w32-<version>_<date>.exe`)
- or [__Gpg4win__](https://www.gpg4win.de/)

#### OSX/Debian

- Refer to [GnuPG binary releases](https://gnupg.org/download/)

## Used GnuPG Commands

- Check GnuPG: `gpg --version` (using [gpg call](https://github.com/drudge/node-gpg))
- List Public Keys: `gpg -k --with-colons` (using [gpg call](https://github.com/drudge/node-gpg))
- List Private Keys: `gpg -K --with-colons` (using [gpg call](https://github.com/drudge/node-gpg))
- Show Smartcard: `gpg --card-status`  (using [gpg call](https://github.com/drudge/node-gpg))
- Encrypt: `gpg --armor --recipient <fingerprint> --encrypt` from stdin to stdout (using [gpg encrypt](https://github.com/drudge/node-gpg))
- Decrypt: `gpg --decrypt` from stdin to stdout (using [gpg decrypt](https://github.com/drudge/node-gpg))
- End session: `gpg-connect-agent killagent /bye`
- Sign File: `gpg --armor --output <filename>.<ext>.sig --local-user <ssb.fingerprint> --detach-sign <filename>.<ext>` (using [gpg call](https://github.com/drudge/node-gpg))
- Verify File: `gpg --verify <filename>.<ext>.sig <filename>.<ext> 2>&1` (using `child_process.exec(...)`)

## Release Notes

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

README.md

### 0.0.3

End session command `gpgconf --kill gpg-agent` replaced with `gpg-connect-agent killagent /bye`

### 0.0.2

Validity in recipient information.

### 0.0.1

Initial release.
