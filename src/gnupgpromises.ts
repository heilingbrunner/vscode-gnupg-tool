import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { ExecOptions } from 'child_process';

import { call, encrypt, decrypt } from 'gpg';
import { GnuPGKey } from './gnupgkey';

export function promise_checkVersion(): Promise<Buffer> {
  return new Promise(function(resolve, reject) {
    var args = ['--version'];

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(result);
    });
  });
}

export function promise_listPublicKeys(): Promise<Buffer> {
  return new Promise(function(resolve, reject) {
    var args = ['-k', '--with-colons'];

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(result);
    });
  });
}

export function promise_listPrivateKeys(): Promise<Buffer> {
  return new Promise(function(resolve, reject) {
    var args = ['-K', '--with-colons'];

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(result);
    });
  });
}

export function promise_parseKeys(stdout: Buffer): Promise<Map<string, GnuPGKey>> {
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

        case 'ssb':
          //#region Details ssb Record

          //record[4]: sub keyId

          //#endregion

          // User Id: name email
          if (key !== null) {
            key.ssbKeyId = record[4];
          }
          break;

        case 'fpr':
          //#region Details fpr Record

          //record[9]: fingerprint

          //#endregion

          // Fingerprint contains keyId
          if (key !== null && record[9].endsWith(key.keyId)) {
            key.fingerprint = record[9];
          }

          if (key !== null && record[9].endsWith(key.ssbKeyId)) {
            key.ssbfingerprint = record[9];
          }
          break;

        case 'uid':
          //#region Details uid Record

          //record[9]: userid

          //#endregion

          // User Id: name email
          if (key !== null) {
            key.userId = record[9];
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

export function promise_encrypt(
  content: Buffer,
  keys?: { name: string; email: string; fingerprint: string }[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--armor'];

    if (keys !== undefined) {
      keys.forEach(recipient => {
        args = args.concat(['--recipient', recipient.fingerprint]);
      });
    }

    encrypt(content, args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(result);
    });
  });
}

export function promise_decrypt(content: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--decrypt'];

    decrypt(content, args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(result);
    });
  });
}

export function promise_showSmartcard(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    var args = ['--card-status'];

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(result);
    });
  });
}

export function promise_killgpgagent(): Promise<{ stdout: string; stderr: string }> {
  //https://www.gnupg.org/documentation/manuals/gnupg/Invoking-GPG_002dAGENT.html
  //https://www.gnupg.org/documentation/manuals/gnupg/Controlling-gpg_002dconnect_002dagent.html#Controlling-gpg_002dconnect_002dagent
  //gpgconf --kill gpg-agent: works on Windows
  //gpg-connect-agent killagent /bye
  return promise_exec('gpg-connect-agent killagent /bye', {});
}

export function promise_bufferToLines(stdout: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let lines = stdout
      .toString()
      .replace(/\r/g, '')
      .trim()
      .split(/\n/g);

    resolve(lines);
  });
}

export function promise_exec(cmd: string, opts: ExecOptions): Promise<{ stdout: string; stderr: string }> {
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

export function promise_filterKeys(
  keys: Map<string, GnuPGKey>,
  predicate: (k: GnuPGKey) => boolean
): Promise<Array<GnuPGKey>> {
  return new Promise((resolve, reject) => {
    resolve(Array.from(keys.values()).filter(k => predicate(k)));
  });
}

export function promise_keysToQuickPickItems(
  keyarray: Array<GnuPGKey>
): Promise<
  {
    label: string;
    description: string;
    detail: string;
    name: string;
    email: string;
    fingerprint: string;
    ssbfingerprint: string;
  }[]
> {
  return new Promise((resolve, reject) => {
    const arr = keyarray.map(k => ({
      label: k.name,
      description: k.email,
      detail: k.fingerprint + ', ' + k.validityDescription,
      name: k.name,
      email: k.email,
      validity: k.validity,
      fingerprint: k.fingerprint,
      ssbfingerprint: k.ssbfingerprint
    }));

    arr ? resolve(arr) : reject();
  });
}

export function promise_keysToText(keys: Map<string, GnuPGKey>): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let recipients: string[] = [];

    keys.forEach(key => {
      recipients.push(key.toString());
    });

    recipients.length > 0 ? resolve(recipients) : reject();
  });
}

export function promise_sign(
  uri: vscode.Uri,
  key?: { name: string; email: string; fingerprint: string; ssbfingerprint: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--armor'];
    args = args.concat(['--output', uri.fsPath + '.sig']);
    if (key !== undefined) {
      args = args.concat(['--local-user', key.ssbfingerprint]);
    }
    args = args.concat(['--detach-sign']);
    args = args.concat([uri.fsPath]);

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(result);
    });
  });
}

export function promise_verify(uri: vscode.Uri): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // GnuPG prints (at least some of) this output to stderr, not stdout. Redirect stderr to stdout using 2>&1
    // call(....) not working, cannot redirect

    let cmd = 'gpg --verify ' + uri.fsPath + ' ' + uri.fsPath.slice(0, -'.sig'.length) + ' 2>&1';
    child_process.exec(cmd, {}, (err, stdout) => (err ? reject('') : resolve(new Buffer(stdout))));
  });
}

export function promise_importKeys(uri: vscode.Uri): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--import'];
    args = args.concat([uri.fsPath]);

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(new Buffer('Import suceeded'));
    });
  });
}

export function promise_exportPublicKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    name: string;
    email: string;
    fingerprint: string;
    ssbfingerprint: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--armor', '--batch', '--yes', '--output', uri.fsPath];
    args = args.concat('--export');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(new Buffer('Export suceeded'));
    });
  });
}

export function promise_exportPrivateKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    name: string;
    email: string;
    fingerprint: string;
    ssbfingerprint: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--armor', '--batch', '--yes', '--output', uri.fsPath];
    args = args.concat('--export-secret-keys');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(new Buffer('Export suceeded'));
    });
  });
}

export function promise_exportPrivateSubKeys(
  uri: vscode.Uri,
  key?: {
    label: string;
    description: string;
    detail: string;
    name: string;
    email: string;
    fingerprint: string;
    ssbfingerprint: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--armor', '--batch', '--yes', '--output', uri.fsPath];
    args = args.concat('--export-secret-subkeys');
    args = args.concat(key ? key.fingerprint : '');

    call('', args, (err: string, result: Buffer) => {
      err ? reject(err) : resolve(new Buffer('Export suceeded'));
    });
  });
}
