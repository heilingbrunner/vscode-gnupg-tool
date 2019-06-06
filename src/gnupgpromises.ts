import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { ExecOptions } from 'child_process';

import { call, encrypt, decrypt, callStreaming, decryptToFile } from './lib/gpg';
import { GnuPGKey } from './gnupgkey';
import { i18n } from './i18n';
import { getWorkspaceUri, isDirectory, isFile } from './utils';
import { GnuPGParameters } from './gnupgparameters';

export function promiseCheckVersion(): Promise<Buffer> {
  return new Promise(function(resolve, reject) {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--version']);

    call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseListPublicKeys(): Promise<Buffer> {
  return new Promise(function(resolve, reject) {
    let args = GnuPGParameters.homedir;
    args = args.concat(['-k', '--with-colons']);

    call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseListSecretKeys(): Promise<Buffer> {
  return new Promise(function(resolve, reject) {
    let args = GnuPGParameters.homedir;
    args = args.concat(['-K', '--with-colons']);

    call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseParseKeys(stdout: Buffer): Promise<Map<string, GnuPGKey>> {
  //see source: gnupg-2.2.12\doc\DETAILS
  //https://github.com/gpg/gnupg/blob/master/doc/DETAILS

  return new Promise((resolve, reject) => {
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

    // resolve, reject
    if (keys.size > 0) {
      resolve(keys);
    } else {
      reject();
    }
  });
}

export function promiseEncryptAsymBuffer(content: Buffer, keys?: { fingerprint: string }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--armor']);

    if (keys !== undefined) {
      keys.forEach(recipient => {
        args = args.concat(['--recipient', recipient.fingerprint]);
      });
    }

    encrypt(content, args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseEncryptSymBuffer(content: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--armor', '--symmetric']);

    call(content, args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseEncryptAsymUri(uri: vscode.Uri, keys?: { fingerprint: string }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--armor', '--batch', '--yes']);

    if (keys !== undefined) {
      keys.forEach(recipient => {
        args = args.concat(['--recipient', recipient.fingerprint]);
      });
    }

    args = args.concat(['--encrypt', uri.fsPath]);
    callStreaming(uri.fsPath, uri.fsPath + '.asc', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseEncryptSymUri(uri: vscode.Uri): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--batch', '--yes', '--armor']);

    args = args.concat(['--symmetric', uri.fsPath]);
    callStreaming(uri.fsPath, uri.fsPath + '.asc', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseDecryptBuffer(content: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    decrypt(content, args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseDecryptUri(uri: vscode.Uri): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let dest = '';
    if (uri.fsPath.match(/.*\.(asc|gpg)$/i)) {
      dest = uri.fsPath.slice(0, -'.asc'.length);
    } else {
      dest = uri.fsPath + '.decrypted';
    }

    decryptToFile({ source: uri.fsPath, dest: dest }, [], (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseShowSmartcard(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--card-status']);

    call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseKillGpgAgent(): Promise<{ stdout: string; stderr: string }> {
  //https://www.gnupg.org/documentation/manuals/gnupg/Invoking-GPG_002dAGENT.html
  //https://www.gnupg.org/documentation/manuals/gnupg/Controlling-gpg_002dconnect_002dagent.html#Controlling-gpg_002dconnect_002dagent
  //gpgconf --kill gpg-agent: works on Windows
  //gpg-connect-agent killagent /bye
  return promiseExec('gpg-connect-agent killagent /bye', {});
}

export function promiseBufferToLines(stdout: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let lines = stdout
      .toString()
      .replace(/\r/g, '')
      .trim()
      .split(/\n/g);

    resolve(lines);
  });
}

export function promiseExec(cmd: string, opts: ExecOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, opts, (err, stdout, stderr) =>
      err
        ? reject(err)
        : resolve({
            stdout: stdout,
            stderr: stderr
          })
    );
  });
}

export function promiseFilterKeys(
  keys: Map<string, GnuPGKey>,
  predicate: (k: GnuPGKey) => boolean
): Promise<Array<GnuPGKey>> {
  return new Promise((resolve, reject) => {
    resolve(Array.from(keys.values()).filter(k => predicate(k)));
  });
}

export function promiseKeysToQuickPickItems(
  keyarray: Array<GnuPGKey>
): Promise<
  {
    label: string;
    description: string;
    detail: string;
    userId: string;
    fingerprint: string;
    keyId: string;
  }[]
> {
  return new Promise((resolve, reject) => {
    const arr = keyarray.map(k => ({
      label: k.userIds.join(','),
      description: k.validityDescription,
      detail: k.fingerprint + ', ' + k.validityDescription,
      validity: k.validity,
      userId: k.userIds[0],
      fingerprint: k.fingerprint,
      keyId: k.keyId
    }));

    arr ? resolve(arr) : reject();
  });
}

export function promiseKeysToText(keys: Map<string, GnuPGKey>): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let recipients: string[] = [];

    keys.forEach(key => {
      recipients.push(key.toString());
    });

    recipients.length > 0 ? resolve(recipients) : reject();
  });
}

export function promiseSign(uri: vscode.Uri, key?: { fingerprint: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--armor', '--batch', '--yes']);
    args = args.concat(['--output', uri.fsPath + '.sig']);
    if (key !== undefined) {
      args = args.concat(['--local-user', key.fingerprint]);
    }
    args = args.concat(['--detach-sign']);
    args = args.concat([uri.fsPath]);

    call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseClearSign(uri: vscode.Uri, key?: { fingerprint: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--armor', '--batch', '--yes']);
    if (key !== undefined) {
      args = args.concat(['--local-user', key.fingerprint]);
    }
    args = args.concat(['--clear-sign']);
    args = args.concat([uri.fsPath]);

    call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stdout);
    });
  });
}

export function promiseVerify(uri: vscode.Uri): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // GnuPG prints (at least some of) this output to stderr, not stdout.

    //for detached or clear-signed file ...
    let args = GnuPGParameters.homedir;
    args = args.concat(['--verify', uri.fsPath]);

    //when detached signed file, add fsPath of data file
    if (uri.fsPath.endsWith('.sig')) {
      args = args.concat([uri.fsPath.slice(0, -'.sig'.length)]);
    }

    call('', args, (err?: { stack?: string }, stdout?: Buffer, stderr?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(stderr);
    });
  });
}

export function promiseImportKeys(uri: vscode.Uri): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--import']);
    args = args.concat([uri.fsPath]);

    call('', args, (err?: { stack?: string } | Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyImportSuccessfully));
    });
  });
}

export function promiseExportPublicKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--armor', '--batch', '--yes', '--output', uri.fsPath]);
    args = args.concat('--export');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: { stack?: string } | Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
}

export function promiseExportSecretKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--armor', '--batch', '--yes', '--output', uri.fsPath]);
    args = args.concat('--export-secret-keys');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
}

export function promiseExportSecretSubKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    fingerprint: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = GnuPGParameters.homedir;
    args = args.concat(['--armor', '--batch', '--yes', '--output', uri.fsPath]);
    args = args.concat('--export-secret-subkeys');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err?: { stack?: string } | Error) => {
      err ? reject(getLastGnuPGError(err)) : resolve(new Buffer(i18n().GnuPGKeyExportSuccessfully));
    });
  });
}

function getLastGnuPGError(err?: { stack?: string } | Error): string {
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

export function promiseDeleteKey(key?: { fingerprint: string; userId: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (key) {
      let args = GnuPGParameters.homedir;
      args = args.concat(['--batch', '--yes']);
      args = args.concat(['--delete-keys']);
      args = args.concat([key.fingerprint]);

      call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
        err ? reject(getLastGnuPGError(err)) : resolve(stdout);
      });
    }
  });
}

export function promiseDeleteSecretKey(key?: { fingerprint: string; userId: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (key) {
      let args = GnuPGParameters.homedir;
      args = args.concat(['--batch', '--yes']);
      args = args.concat(['--delete-secret-keys']);
      args = args.concat([key.fingerprint]);

      call('', args, (err?: { stack?: string } | Error, stdout?: Buffer) => {
        err ? reject(getLastGnuPGError(err)) : resolve(stdout);
      });
    }
  });
}

export function promiseCheckHomeDir(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    //Check ...
    // public : pubring.kbx or pubring.gpg
    // secret : folder: private-keys-v1.d or file : secring.gpg

    let path = getWorkspaceUri();
    if (path) {
      let pubexists = isFile(path.fsPath + '/pubring.kbx') || isFile(path.fsPath + '/pubring.gpg');
      let secexists = isDirectory(path.fsPath + '/private-keys-v1.d') || isFile(path.fsPath + '/secring.gpg');

      if (pubexists && secexists) {
        resolve(path.fsPath);
      } else {
        resolve(undefined);
      }
    }
  });
}
