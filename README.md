# GnuPG Tool

![GnuPG Tool logo](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/vscode-gnupg-tool-logo.png)

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
[![Build Status](https://travis-ci.org/heilingbrunner/vscode-gnupg-tool.svg?branch=master)](https://travis-ci.org/heilingbrunner/vscode-gnupg-tool)
![Installs](https://vsmarketplacebadge.apphb.com/installs-short/JHeilingbrunner.vscode-gnupg-tool.svg)
![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/JHeilingbrunner.vscode-gnupg-tool.svg)

## What's new in GnuPG-Tool

- Support for an alternate homedir/key ring. Details see below.

## Features

- __Check__ GnuPG availability/version.
- Encryption for multiple __recipients__ or with simple __passphrase__
- __Encrypt__/__decrypt__ text or file to text, file or preview
- Passphrase/Pin entry __only__ into original GnuPG __Pinentry__ dialog. Not through Visual Studio Code or something else.
- End session to reset password cache by __killing gpg-agent__.
- Works with __smartcards__.
- __Sign__/__verify__ file.
- Keys __generate__/__edit__/__delete__/__import__/__export__.
- Detects local/alternated __homedir__

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

Available commands:

- Check GnuPG
- Copy Fingerprint To Clipboard (using Windows: CLIP, Linux: XCLIP, MacOS: PBCOPY)
- Copy KeyId To Clipboard (using Windows: CLIP, Linux: XCLIP, MacOS: PBCOPY)
- Decrypt ... (opens sub menu)
- Decrypt File
- Decrypt Preview
- Decrypt Selection
- Delete Key
- Delete Secret Key
- Edit Public Key (with use of the internal terminal)
- Encrypt ... (opens sub menu)
- Encrypt File For Recipients
- Encrypt File w/ Passphrase
- Encrypt Preview For Recipients
- Encrypt Preview w/ Passphrase
- Encrypt Selection For Recipients
- Encrypt Selection w/ Passphrase
- End Session
- Environment ... (opens sub menu)
- Export Public Keys
- Export Secret Keys
- Export Secret Sub-Keys
- Generate Key
- Import Keys
- Keys ... (opens sub menu)
- List Public Keys
- List Secret Keys
- Show Smartcard
- Sign File
- Trust ... (opens sub menu)
- Verify File

The explorer context menu ...

![Explorer context menu](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/explorer-context-menu.png)

The editor context menu ...

![Editor context menu](https://raw.githubusercontent.com/heilingbrunner/vscode-gnupg-tool/master/images/editor-context-menu.png)

## Used References

- [VSCode GPG extension](https://marketplace.visualstudio.com/items?itemName=jvalecillos.gpg) by Jose Valecillos
- [node-gpg](https://github.com/drudge/node-gpg) by Nicholas Penree
- [GNU Privacy Guard](https://en.wikipedia.org/wiki/GNU_Privacy_Guard)
- [GnuPG documentation](https://www.gnupg.org/documentation/manuals/gnupg/index.html#SEC_Contents) 

## Usage

### Used File extensions

#### The `*.asc` Files

- `<filename>.<ext>.asc`: This should be an ascii encrypted file (option: `--armor`) of the `<filename>.<ext>` file.
- It although can be an ascii encoded key file.

#### The `*.sig` Files

- `<filename>.<ext>.sig`: This should be an ascii encoded signature file corresponding to `<filename>.<ext>`.

#### The `*.key` Files

- `<filename>.key`: This should be an ascii encrypted key (option: `--armor`)

#### Support for an alternate homedir/key ring

When VSCode is opened in a folder with (file:`pubring.kbx` __OR__ file:`pubring.gpg`) __AND__ (folder:`private-keys-v1.d` __OR__ file:`secring.gpg`), then the `--homedir` parameter is used in every command of this instance.
> Using several VSCode instances at the same time is not recommended, because the `gpg-agent` is running in the background for one session. Otherwise you have to kill the session. __TIP: Change folder in one instance, because `gpg-agent` will be killed automatically.__

## Requirements

### GnuPG

#### Windows

- Use pure [__GnuPG__](https://www.gnupg.org/ftp/gcrypt/binary/) installation (`gnupg-w32-<version>_<date>.exe`)
- or [__Gpg4win__](https://www.gpg4win.de/)

#### OSX

- [GPG Suite](https://gpgtools.org/)

#### Debian

- Refer to [GnuPG binary releases](https://gnupg.org/download/)
