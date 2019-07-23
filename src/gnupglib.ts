import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { ExecOptions } from 'child_process';

import { call, encrypt, decrypt, callStreaming, decryptToFile } from './lib/gpg';
import { GnuPGKey } from './gnupgkey';
import { i18n } from './i18n';
import { getWorkspaceUri, isDirectory, isFile } from './utils';
import { GnuPGGlobal } from './gnupgglobal';

export async function promiseCheckVersion(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
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

export async function promiseCheckWorkspaceAsHomeDir(): Promise<string | undefined> {
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

export function isKeyRingDirectory(path: vscode.Uri | undefined): boolean {
  // Check ...
  // public : pubring.kbx or pubring.gpg
  // secret : folder: private-keys-v1.d or file : secring.gpg
  if (path) {
    let pubexists = isFile(path.fsPath + '/pubring.kbx') || isFile(path.fsPath + '/pubring.gpg');
    let secexists = isDirectory(path.fsPath + '/private-keys-v1.d') || isFile(path.fsPath + '/secring.gpg');

    if (pubexists && secexists) {
      return true;
    }
  }

  return false;
}

export async function promiseListPublicKeys(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['-k', '--with-colons']);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function promiseListSecretKeys(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['-K', '--with-colons']);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
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
    switch (record[0]) {
      case 'pub':
      case 'sec':
        //#region Details pub Record:

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
  }

  // Add last key
  if (key !== null && !keys.has(key.keyId)) {
    keys.set(key.keyId, key);
  }

  return keys;
}

export async function promiseEncryptAsymBuffer(content: Buffer, keys?: { fingerprint: string }[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
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

export async function promiseEncryptSymBuffer(content: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--armor', '--symmetric']);

    call(content, args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function promiseEncryptAsymUri(uri: vscode.Uri, keys?: { fingerprint: string }[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--armor']);

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

export async function promiseEncryptSymUri(uri: vscode.Uri): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--armor']);

    args = args.concat(['--symmetric', uri.fsPath]);
    callStreaming(uri.fsPath, uri.fsPath + '.asc', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function promiseDecryptBuffer(content: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    decrypt(content, args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function promiseDecryptUri(uri: vscode.Uri): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let dest = '';
    if (uri.fsPath.match(/.*\.(asc|gpg)$/i)) {
      dest = uri.fsPath.slice(0, -'.asc'.length);
    } else {
      dest = uri.fsPath + '.decrypted';
    }

    decryptToFile({ source: uri.fsPath, dest: dest }, [], (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function promiseShowSmartcard(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--card-status']);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function promiseKillGpgAgent(): Promise<void> {
  //https://www.gnupg.org/documentation/manuals/gnupg/Invoking-GPG_002dAGENT.html
  //https://www.gnupg.org/documentation/manuals/gnupg/Controlling-gpg_002dconnect_002dagent.html#Controlling-gpg_002dconnect_002dagent
  //gpgconf --kill gpg-agent: works on Windows
  //gpg-connect-agent killagent /bye

  if (GnuPGGlobal.majorVersion === 2) {
    // gpg-connect-agent since v2
    promiseExec('gpg-connect-agent killagent /bye', {});

    if (GnuPGGlobal.homedir) {
      let homedir = '--homedir ' + GnuPGGlobal.homedir;
      promiseExec('gpg-connect-agent ' + homedir + ' killagent /bye', {});
    }
  } else {
    return new Promise(resolve => resolve());
  }
}

export function bufferToLines(stdout: Buffer): string[] {
  let lines = stdout
    .toString()
    .replace(/\r/g, '')
    .trim()
    .split(/\n/g);

  return lines;
}

export function linesToVersion(lines: string[]): string | undefined {
  for (let line of lines) {
    if (line.startsWith('gpg (GnuPG) ')) {
      return line.substr('gpg (GnuPG) '.length).trim();
    }
  }
  return undefined;
}

export function linesToHome(lines: string[]): string | undefined {
  for (let line of lines) {
    if (line.startsWith('Home: ')) {
      return line.substr('Home: '.length).trim();
    }
  }
  return undefined;
}

export async function promiseExec(cmd: string, opts: ExecOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    child_process.exec(
      cmd,
      opts,
      (err, stdout, stderr) =>
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

export function filterKeys(keys: Map<string, GnuPGKey>, predicate: (k: GnuPGKey) => boolean): Array<GnuPGKey> {
  return Array.from(keys.values()).filter(k => predicate(k));
}

export function keysToQuickPickItems(
  keyarray: Array<GnuPGKey>
): {
  label: string;
  description: string;
  detail: string;
  userId: string;
  fingerprint: string;
  keyId: string;
}[] {
  const arr = keyarray.map(k => ({
    label: k.userIds.join(','),
    description: k.validityDescription,
    detail: k.fingerprint + ', ' + k.validityDescription,
    validity: k.validity,
    userId: k.userIds[0],
    fingerprint: k.fingerprint,
    keyId: k.keyId
  }));

  return arr;
}

export function keysToText(keys: Map<string, GnuPGKey>): string[] {
  let recipients: string[] = [];

  keys.forEach(key => {
    recipients.push(key.toString());
  });

  return recipients;
}

export async function promiseSign(uri: vscode.Uri, key?: { fingerprint: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--armor']);
    args = args.concat(['--output', uri.fsPath + '.sig']);
    if (key !== undefined) {
      args = args.concat(['--local-user', key.fingerprint]);
    }
    args = args.concat(['--detach-sign']);
    args = args.concat([uri.fsPath]);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function promiseClearSign(uri: vscode.Uri, key?: { fingerprint: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--armor']);
    if (key !== undefined) {
      args = args.concat(['--local-user', key.fingerprint]);
    }
    args = args.concat(['--clear-sign']);
    args = args.concat([uri.fsPath]);

    call('', args, (err?: Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export async function promiseVerify(uri: vscode.Uri): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    // GnuPG prints (at least some of) this output to stderr, not stdout.

    //for detached or clear-signed file ...
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--verify', uri.fsPath]);

    //when detached signed file, add fsPath of data file
    if (uri.fsPath.endsWith('.sig')) {
      args = args.concat([uri.fsPath.slice(0, -'.sig'.length)]);
    }

    call('', args, (err?: Error, stdout?: Buffer, stderr?: Buffer, data?: string) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(data || ''));
    });
  });
}

export async function promiseImportKeys(uri: vscode.Uri): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--import']);
    args = args.concat([uri.fsPath]);

    call('', args, (err?: Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyImportSuccessfully));
    });
  });
}

export async function promiseExportPublicKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--armor', '--output', uri.fsPath]);
    args = args.concat('--export');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
}

export async function promiseExportSecretKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--armor', '--output', uri.fsPath]);
    args = args.concat('--export-secret-keys');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
}

export async function promiseExportSecretSubKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let args = GnuPGGlobal.defaultargs;
    args = args.concat(['--armor', '--output', uri.fsPath]);
    args = args.concat('--export-secret-subkeys');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
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

export async function promiseDeletePublicKey(key?: { fingerprint: string; userId: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    if (key) {
      let args = GnuPGGlobal.defaultargs;
      args = args.concat(['--delete-keys']);
      args = args.concat([key.fingerprint]);

      call('', args, (err?: Error, stdout?: Buffer) => {
        err ? reject(getLastGnuPGError(err)) : resolve(stdout);
      });
    }
  });
}

export async function promiseDeleteSecretKey(key?: { fingerprint: string; userId: string }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    if (key) {
      let args = GnuPGGlobal.defaultargs;
      args = args.concat(['--delete-secret-keys']);
      args = args.concat([key.fingerprint]);

      call('', args, (err?: Error, stdout?: Buffer) => {
        err ? reject(getLastGnuPGError(err)) : resolve(stdout);
      });
    }
  });
}
