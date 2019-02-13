import { call, encrypt, decrypt } from 'gpg';
import * as child_process from 'child_process';
import { ExecOptions } from 'child_process';
import { GnuPGKey } from './gnupgkey';

export function promise_checkVersion(): Promise<Buffer> {
  return new Promise(function(resolve, reject) {
    var args = ['--version'];

    call('', args, (err: string, result: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export function promise_listRecipients(): Promise<Buffer> {
  return new Promise(function(resolve, reject) {
    var args = ['-k', '--with-colons'];

    call('', args, (err: string, result: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export function promise_readKeys(stdout: Buffer): Promise<Map<string, GnuPGKey>> {
  //see source: gnupg-2.2.12\doc\DETAILS

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
      //sec :: Secret key
      //ssb :: Secret subkey (secondary key)
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
  selectedText: Buffer,
  recipients?: { name: string; email: string; fingerprint: string }[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--armor'];

    if (recipients !== undefined) {
      recipients.forEach(recipient => {
        args = args.concat(['--recipient', recipient.fingerprint]); // + ' <' + recipient.email + '>';
      });
    }

    encrypt(selectedText, args, (err: string, result: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export function promise_decrypt(selectedText: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args = ['--decrypt'];

    decrypt(selectedText, args, (err: string, result: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export function promise_showSmartcard(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    var args = ['--card-status'];

    call('', args, (err: string, result: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
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

export function promise_extractVersions(stdout: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let versions = '';

    let lines = stdout
      .toString()
      .replace(/\r/g, '')
      .trim()
      .split(/\n/g);

    if (lines.length >= 2) {
      versions = lines[0] + ', ' + lines[1];
    }

    resolve(lines);
  });
}

export function promise_exec(cmd: string, opts: ExecOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const cp = child_process.exec(cmd, opts, (err, stdout, stderr) =>
      err
        ? reject(err)
        : resolve({
            stdout: stdout,
            stderr: stderr
          })
    );
  });
}

export function promise_RecipientsToOptions(
  keys: Map<string, GnuPGKey>
): Promise<{ label: string; description: string; detail: string; name: string; email: string; fingerprint: string }[]> {
  return new Promise((resolve, reject) => {
    const arr = Array.from(keys.values())
      .filter(k => !k.isDisabled && k.canEncrypt)
      .map(k => ({
        label: k.name,
        description: k.email,
        detail: k.fingerprint + ', ' + k.validityDescription,
        name: k.name,
        email: k.email,
        validity: k.validity,
        fingerprint: k.fingerprint
      }));

    arr ? resolve(arr) : reject();
  });
}

export function promise_KeysToText(keys: Map<string, GnuPGKey>): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let recipients: string[] = [];

    keys.forEach(key => {
      recipients.push(key.toString());
    });

    recipients.length > 0 ? resolve(recipients) : reject();
  });
}
