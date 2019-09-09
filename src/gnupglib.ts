import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { ExecOptions } from 'child_process';
import { GnuPGKey } from './gnupgkey';
import { GnuPGGlobal } from './gnupgglobal';
import { i18n } from './i18n';
import {
  call,
  callStreaming,
  decrypt,
  decryptToFile,
  encrypt
} from './lib/gpg';
import {
  getWorkspaceUri,
  isKeyRingDirectory
} from './utils';

export async function asyncCheckVersion(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--version']);

    call('', args, (err?: Error, stdout?: Buffer) => {
      if (err) {
        reject(getLastGnuPGError(err));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function asyncCheckWorkspaceAsHomeDir(): Promise<string | undefined> {
  return new Promise<string | undefined>(resolve => {
    let path = getWorkspaceUri();
    if (path) {
      let iskeyring = isKeyRingDirectory(path);

      if (iskeyring) {
        resolve(path.fsPath);
      }
    }
    resolve(undefined);
  });
}

export async function asyncListPublicKeys(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['-k', '--with-colons', '--fingerprint']);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function asyncListSecretKeys(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['-K', '--with-colons', '--fingerprint']);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function asyncEncryptAsymBuffer(content: Buffer, keys?: { fingerprint: string }[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--armor']);

    if (keys !== undefined) {
      keys.forEach(recipient => {
        args = args.concat(['--recipient', recipient.fingerprint]);
      });
    }

    encrypt(content, args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function asyncEncryptSymBuffer(content: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--armor', '--symmetric']);

    call(content, args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function asyncEncryptAsymUri(uri: vscode.Uri, keys?: { fingerprint: string }[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--armor']);

    if (keys !== undefined) {
      keys.forEach(recipient => {
        args = args.concat(['--recipient', recipient.fingerprint]);
      });
    }

    args = args.concat(['--encrypt', uri.fsPath]);

    callStreaming(uri.fsPath, uri.fsPath + '.asc', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function argsEncryptSymUri(uri: vscode.Uri): string[] {
  let args: string[] = [];

  switch (GnuPGGlobal.majorVersion) {
    case 1:
      args = GnuPGGlobal.homedirArg;
      args = args.concat(['--armor']);
      args = args.concat(['--output', uri.fsPath + '.asc']);
      args = args.concat(['--symmetric', uri.fsPath]);
      break;

    case 2:
      args = GnuPGGlobal.homedirArg;
      args = args.concat(['--batch','--yes','--armor']);
      args = args.concat(['--symmetric', uri.fsPath]);
      break;

    default:
  }

  return args;
}

export async function asyncEncryptSymUri(uri: vscode.Uri): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = argsEncryptSymUri(uri);

    callStreaming(uri.fsPath, uri.fsPath + '.asc', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function asyncDecryptBuffer(content: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    decrypt(content, args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function argsDecryptUri(uri: vscode.Uri): string[] {
  let args: string[] = [];

  switch (GnuPGGlobal.majorVersion) {
    case 1:
      let dest = '';
      if (uri.fsPath.match(/.*\.(asc|gpg)$/i)) {
        dest = uri.fsPath.slice(0, -'.asc'.length);
      } else {
        dest = uri.fsPath + '.decrypted';
      }
      args = GnuPGGlobal.homedirArg;
      args = args.concat(['--output', dest, '--decrypt', uri.fsPath]);
      break;

    case 2:
      args = GnuPGGlobal.homedirArg;
      break;

    default:
  }

  return args;
}

export async function asyncDecryptUri(uri: vscode.Uri): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let dest = '';
    if (uri.fsPath.match(/.*\.(asc|gpg)$/i)) {
      dest = uri.fsPath.slice(0, -'.asc'.length);
    } else {
      dest = uri.fsPath + '.decrypted';
    }

    let args = argsDecryptUri(uri);

    decryptToFile({ source: uri.fsPath, dest: dest }, args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function asyncShowSmartcard(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--card-status']);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function asyncKillGpgAgent(): Promise<void> {
  //https://www.gnupg.org/documentation/manuals/gnupg/Invoking-GPG_002dAGENT.html
  //https://www.gnupg.org/documentation/manuals/gnupg/Controlling-gpg_002dconnect_002dagent.html#Controlling-gpg_002dconnect_002dagent
  //gpgconf --kill gpg-agent: works on Windows
  //gpg-connect-agent killagent /bye
  switch (GnuPGGlobal.majorVersion) {
    case 1:
      return new Promise(resolve => resolve());
    case 2:
      // gpg-connect-agent since v2
      asyncExec('gpg-connect-agent killagent /bye', {});

      if (GnuPGGlobal.homedir) {
        let homedir = '--homedir ' + GnuPGGlobal.homedir;
        asyncExec('gpg-connect-agent ' + homedir + ' killagent /bye', {});
      }
      break;
    default:
      return new Promise(resolve => resolve());
  }
}

export async function asyncExec(cmd: string, opts: ExecOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    child_process.exec(
      cmd,
      opts,
      (err) =>
        err
          ? reject(err)
          : // : resolve({           -> Promise<{ stdout: string; stderr: string }>
          //   stdout: stdout,
          //   stderr: stderr
          // })
          resolve() //           -> Promise<void>
    );
  });
}

export function argsSign(uri: vscode.Uri, key?: { fingerprint: string }): string[] {
  let args: string[] = [];

  //v1,2
  args = GnuPGGlobal.homedirArg;
  args = args.concat(['--yes', '--armor']);
  args = args.concat(['--output', uri.fsPath + '.sig']);
  if (key !== undefined) {
    args = args.concat(['--local-user', key.fingerprint]);
  }
  args = args.concat(['--detach-sign']);
  args = args.concat([uri.fsPath]);

  return args;
}

export async function asyncSign(uri: vscode.Uri, key?: { fingerprint: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = argsSign(uri, key);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function argsClearSign(uri: vscode.Uri, key?: { fingerprint: string }): string[] {
  let args: string[] = [];

  switch (GnuPGGlobal.majorVersion) {
    case 1:
      args = GnuPGGlobal.homedirArg;
      args = args.concat(['--yes', '--armor']);
      if (key !== undefined) {
        args = args.concat(['--local-user', key.fingerprint]);
      }
      args = args.concat(['--clearsign']); //<--v1
      args = args.concat([uri.fsPath]);
      break;

    case 2:
      args = GnuPGGlobal.homedirArg;
      args = args.concat(['--yes', '--armor']);
      if (key !== undefined) {
        args = args.concat(['--local-user', key.fingerprint]);
      }
      args = args.concat(['--clear-sign']); //<--v2
      args = args.concat([uri.fsPath]);
      break;

    default:
  }

  return args;
}

export async function asyncClearSign(uri: vscode.Uri, key?: { fingerprint: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = argsClearSign(uri, key);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function asyncVerify(uri: vscode.Uri): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    // GnuPG prints (at least some of) this output to stderr, not stdout.

    //for detached or clear-signed file ...
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--verify', uri.fsPath]);

    //when detached signed file, add fsPath of data file
    if (uri.fsPath.endsWith('.sig')) {
      args = args.concat([uri.fsPath.slice(0, -'.sig'.length)]);
    }

    call('', args, (err?: Error, stdout?: Buffer, stderr?: Buffer, data?: string) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(data || ''));
    });
  });
}

export async function asyncImportKeys(uri: vscode.Uri): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--import']);
    args = args.concat([uri.fsPath]);

    call('', args, (err?: Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyImportSuccessfully));
    });
  });
}

export async function asyncExportPublicKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--armor', '--output', uri.fsPath]);
    args = args.concat('--export');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
}

export async function asyncExportSecretKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--armor', '--output', uri.fsPath]);
    args = args.concat('--export-secret-keys');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
}

export async function asyncExportSecretSubKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--armor', '--output', uri.fsPath]);
    args = args.concat('--export-secret-subkeys');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
}

export function argsGenerateKey() {
  let args = GnuPGGlobal.homedirArg;

  switch (GnuPGGlobal.majorVersion) {
    case 1:
      args = args.concat(['--gen-key']);
      break;
    case 2:
      args = args.concat(['--full-generate-key']);
      break;
    default:
  }
  return args;
}

export function argsEditKey(key?: { fingerprint: string; userId: string }) {
  let args: string[] = [];

  //v1,2
  if (key) {
    args = GnuPGGlobal.homedirArg;
    args = args.concat(['--edit-key', key.fingerprint]);
  }

  return args;
}

export function argsDeletePublicKey(key?: { fingerprint: string; userId: string }): string[] {
  let args: string[] = [];

  //v1,2
  if (key) {
    args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--delete-keys']);
    args = args.concat([key.fingerprint]);
  }

  return args;
}

export async function asyncDeletePublicKey(key?: { fingerprint: string; userId: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    if (key) {
      let args = argsDeletePublicKey(key);

      call('', args, (err?: Error, stdout?: Buffer) => {
        err ? reject(getLastGnuPGError(err)) : resolve(stdout);
      });
    }
  });
}

export function argsDeleteSecretKey(key?: { fingerprint: string; userId: string }): string[] {
  let args: string[] = [];

  //v1,2
  if (key) {
    args = GnuPGGlobal.homedirArg;
    args = args.concat(['--batch', '--yes', '--delete-secret-keys']);
    args = args.concat([key.fingerprint]);
  }

  return args;
}

export async function asyncDeleteSecretKey(key?: { fingerprint: string; userId: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    if (key) {
      let args = argsDeleteSecretKey(key);

      call('', args, (err?: Error, stdout?: Buffer) => {
        err ? reject(getLastGnuPGError(err)) : resolve(stdout);
      });
    }
  });
}

export function parseKeys(stdout: Buffer): Map<string, GnuPGKey> {
  //see source: gnupg-2.2.12\doc\DETAILS
  //https://github.com/gpg/gnupg/blob/master/doc/DETAILS

  let lines = stdout
    .toString()
    .trim()
    .split(/(\r\n|\n)/g);

  let keys = new Map<string, GnuPGKey>();
  let key: GnuPGKey | null = null;

  for (var i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const record = line.split(':');

    switch (GnuPGGlobal.majorVersion) {
      case 1:
        //#region Records


        //pub:u:2048:1:6766822C85E0F4E6:2019-09-04:::u:Delete Me (weg) <d.m@nix.de>::scSC:

        //pub :: Public key
        //crt :: X.509 certificate
        //crs :: X.509 certificate and private key available
        //sub :: Subkey (secondary key)
        //sec :: Private key
        //ssb :: Private subkey (secondary key)
        //uid :: User id
        //uat :: User attribute (same as user id except for field 10).
        //sig :: Signature
        //rev :: Revocation signature
        //rvs :: Revocation signature (standalone) [since 2.2.9]
        //fpr :: Fingerprint (fingerprint is in field 10)
        //pkd :: Public key data [*]
        //grp :: Keygrip
        //rvk :: Revocation key
        //tfs :: TOFU statistics [*]
        //tru :: Trust database information [*]
        //spk :: Signature subpacket [*]
        //cfg :: Configuration data [*]

        //#endregion
        switch (record[0]) {
          case 'pub':
          case 'sec':
            //#region Details pub Record:

            //pub:u:4096:1:069E5389FFEE0B51:2019-09-04:::u:Donald Duck (The real Donald ...) <d.duck@disney.com>::scSC:

            //record[0]: Type of record
            //record[1]: Validity
            //record[2]: Key length
            //record[3]: Public key algorithm
            //record[4]: KeyID
            //record[5]: Creation date
            //record[6]: Expiration date
            //record[7]: Certificate S/N, UID hash, trust signature info
            //record[8]: Ownertrust
            //record[9]: User-ID
            //record[10]: Signature class
            //record[11]: Key capabilities
            //record[12]: Issuer certificate fingerprint or other info
            //record[13]: Flag field
            //record[14]: S/N of a token
            //record[15]: Hash algorithm
            //record[16]: Curve name
            //record[17]: Compliance flags
            //record[18]: Last update
            //record[19]: Origin
            //record[20]: Comment

            //#endregion

            // Add previous key, if exists
            if (key !== null && !keys.has(key.keyId)) {
              keys.set(key.keyId, key);
            }

            //create new key
            key = new GnuPGKey();
            (key.keyId = record[4]),
              (key.expiration = record[5]),
              (key.capabilities = record[11]),
              (key.validity = record[1]);

            // v1
            key.addUserId(record[9]);

            break;

          case 'fpr':
            //#region Details fpr Record

            //record[9]: fingerprint

            //#endregion

            // Fingerprint contains keyId
            if (key !== null && record[9].endsWith(key.keyId)) {
              key.fingerprint = record[9];
            }
            break;

          case 'uid':
            //#region Details uid Record

            //record[9]: userid

            //#endregion

            // User Id: name email
            if (key !== null) {
              key.addUserId(record[9]);
            }
            break;
        }
        break;

      case 2:
        //#region Records

        //pub :: Public key
        //crt :: X.509 certificate
        //crs :: X.509 certificate and private key available
        //sub :: Subkey (secondary key)
        //sec :: Private key
        //ssb :: Private subkey (secondary key)
        //uid :: User id
        //uat :: User attribute (same as user id except for field 10).
        //sig :: Signature
        //rev :: Revocation signature
        //rvs :: Revocation signature (standalone) [since 2.2.9]
        //fpr :: Fingerprint (fingerprint is in field 10)
        //pkd :: Public key data [*]
        //grp :: Keygrip
        //rvk :: Revocation key
        //tfs :: TOFU statistics [*]
        //tru :: Trust database information [*]
        //spk :: Signature subpacket [*]
        //cfg :: Configuration data [*]

        //#endregion
        switch (record[0]) {
          case 'pub':
          case 'sec':
            //#region Details pub Record:

            //pub:u:4096:1:8E04619523BDC7D4:1577740263:::u:::scESCA::::::23::0:
            //uid:u::::1577740263::19196D19B299EFD63210E523D1F0AC5BFF893FB0::James Bond <j.bond@mi6.com>::::::::::0

            //record[0]: Type of record
            //record[1]: Validity
            //record[2]: Key length
            //record[3]: Public key algorithm
            //record[4]: KeyID
            //record[5]: Creation date
            //record[6]: Expiration date
            //record[7]: Certificate S/N, UID hash, trust signature info
            //record[8]: Ownertrust
            //record[9]: User-ID
            //record[10]: Signature class
            //record[11]: Key capabilities
            //record[12]: Issuer certificate fingerprint or other info
            //record[13]: Flag field
            //record[14]: S/N of a token
            //record[15]: Hash algorithm
            //record[16]: Curve name
            //record[17]: Compliance flags
            //record[18]: Last update
            //record[19]: Origin
            //record[20]: Comment

            //#endregion

            // Add previous key, if exists
            if (key !== null && !keys.has(key.keyId)) {
              keys.set(key.keyId, key);
            }

            //create new key
            key = new GnuPGKey();
            (key.keyId = record[4]),
              (key.expiration = record[6]),
              (key.capabilities = record[11]),
              (key.validity = record[1]);

            break;

          case 'fpr':
            //#region Details fpr Record

            //record[9]: fingerprint

            //#endregion

            // Fingerprint contains keyId
            if (key !== null && record[9].endsWith(key.keyId)) {
              key.fingerprint = record[9];
            }
            break;

          case 'uid':
            //#region Details uid Record

            //record[9]: userid

            //#endregion

            // User Id: name email
            if (key !== null) {
              key.addUserId(record[9]);
            }
            break;
        }
        break;

      default:
        break;
    }

    // Add last key
    if (key !== null && !keys.has(key.keyId)) {
      keys.set(key.keyId, key);
    }
  }

  return keys;
}

function getLastGnuPGError(err?: Error): string {
  let gpgerror = '';

  if (err && err.stack) {
    err.stack.split(/(\r|)\n/).forEach((entry: string) => {
      if (gpgerror.length === 0) {
        gpgerror = entry;
      }

      if (entry.match(/gpg:/)) {
        gpgerror = entry;
      }
    });
  }

  return gpgerror;
}
