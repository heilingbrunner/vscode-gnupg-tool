# Change Log

## [1.3.5] - 2020-04-28

- addtional context menu (editor/title/context)

## [1.3.4] - 2020-03-17

- security update

## [1.3.3] - 2019-12-20

- security update

## [1.3.2] - 2019-11-21

- MacGPG2 fix

## [1.3.1] - 2019-09-10

- travis ci tag removed

## [1.3.0] - 2019-09-10

- support for gnupg v1.4
- code folding

## [1.2.0] - 2019-07-22

- configuration setting for homedir/keyring location

## [1.1.0] - 2019-06-11

- support of alternating homedir/keyring location

## [1.0.9] - 2019-05-10

- delete public/secret key improved

## [1.0.8] - 2019-05-10

- new clear-sign command
- verify detached (`*.sig`) or clear-signed (`*.asc`) files

## [1.0.7] - 2019-05-04

- devDependencies update
- sub menus
- more commands

## [1.0.6] - 2019-04-12

- new command groups `Environment ...`, `Encrypt ...`, `Decrypt ...` and `Trust ...`
- default folder for showOpenDialog() set to workspace folder

## [1.0.5] - 2019-03-25

- `*.key` extension for key files

## [1.0.4] - 2019-03-19

- support for `ru` language

## [1.0.3] - 2019-03-19

- support for several languages (en,de,es,fr,zh-CN)

## [1.0.2] - 2019-03-13

- a little bit syntax highlighting for *.asc file
  
## [1.0.1] - 2019-03-08

- better error handling
- display multi userids

## [1.0.0] - 2019-03-04

- verify using npm.gpg.call(...)

## [0.0.10] - 2019-03-03

- using better npm.gpg ...stream/...ToFile functions

## [0.0.9] - 2019-03-01

- encryption with passphrase

## [0.0.8] - 2019-02-26

- import/export of public/private keys

## [0.0.7] - 2019-02-25

- ShowOpenDialog() instead of several info messages 'GnuPG: No file selected ! Please use explorer context menu.'

## [0.0.6] - 2019-02-15

- filter keys for sign and encrypt file

## [0.0.5] - 2019-02-15

- Encryption only for enabled, capable [E] and valid recipients
- Previews
- Context menus
- Smartcard details
- GnuPG version
- Statusbar item with GnuPG version

## [0.0.4] - 2019-02-06

- README.md

## [0.0.3] - 2019-02-04

- End session command `gpgconf --kill gpg-agent` replaced with `gpg-connect-agent killagent /bye`

## [0.0.2] - 2019-02-01

- Validity in recipient information.

## [0.0.1] - 2019-02-01

- Initial release