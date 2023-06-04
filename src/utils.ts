import { exec } from 'child_process';
import { readFile, statSync, writeFile, existsSync } from 'fs';
import { Uri, window, workspace } from 'vscode';
import { GnuPGKey } from './gnupgkey';
import { i18n } from './i18n';
import { join } from 'path';

export function getContent(uri: Uri): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (uri.scheme === 'file') {
      const filepath = uri.fsPath;

      readFile(filepath, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    } else {
      resolve(new Buffer('.'));
    }
  });
}

export function setContent(uri: Uri, content: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // fs.writeFileSync(newUri.fsPath, encrypted);
    writeFile(uri.fsPath, content, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}

export function getWorkspaceUri(): Uri | undefined {
  let uri = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri : undefined;
  return uri;
}

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  if ('code' in (e as any)) {return true;}
  else {return false;}
}

export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch (e) {
    if (isErrnoException(e) && e.code === 'ENOENT') {
      return false;
    } else {
      throw e;
    }
  }
}

export function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch (e) {
    if (isErrnoException(e) && e.code === 'ENOENT') {
      return false;
    } else {
      throw e;
    }
  }
}

export function isKeyRingDirectory(path: Uri | undefined): boolean {
  // Check ...
  // public : pubring.kbx or pubring.gpg
  // secret : folder: private-keys-v1.d or file : secring.gpg

  if (path) {
    const pubExists = existsSync(join(path.fsPath, 'pubring.kbx')) || existsSync(join(path.fsPath, 'pubring.gpg'));
    const secExists = existsSync(join(path.fsPath, 'private-keys-v1.d')) || existsSync(join(path.fsPath, 'secring.gpg'));

    if (pubExists && secExists) {
      return true;
    }
  }

  return false;
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
  const arr = keyarray.map((k) => ({
    label: k.userIds.join(','),
    description: k.validityDescription,
    detail: k.fingerprint + ', ' + k.validityDescription,
    validity: k.validity,
    userId: k.userIds[0],
    fingerprint: k.fingerprint,
    keyId: k.keyId,
  }));

  return arr;
}

export function filterKeys(keys: Map<string, GnuPGKey>, predicate: (k: GnuPGKey) => boolean): Array<GnuPGKey> {
  return Array.from(keys.values()).filter((k) => predicate(k));
}

export function runInTerminal(command: string) {
  const terminal = window.createTerminal(i18n().GnuPGTerminal);
  terminal.show();
  terminal.sendText(command, false);
}

export function copyToClipboard(text: string) {
  switch (process.platform) {
    case 'darwin':
      exec('echo ' + text + ' | pbcopy');
      break;
    case 'win32':
      exec('echo ' + text + ' | clip');
      break;
    case 'linux':
      exec('echo ' + text + ' | xclip -selection c');
      break;
    default:
      throw new Error(i18n().GnuPGNotSupportedPlatform + "'" + process.platform + "'");
  }
}

export function bufferToLines(stdout: Buffer): string[] {
  let lines = stdout.toString().replace(/\r/g, '').trim().split(/\n/g);

  return lines;
}

export function linesToVersion(lines: string[]): string | undefined {
  for (let line of lines) {
    if (line.startsWith('gpg (GnuPG) ')) {
      return line.substr('gpg (GnuPG) '.length).trim();
    } else if (line.startsWith('gpg (GnuPG/MacGPG2) ')) {
      return line.substr('gpg (GnuPG/MacGPG2) '.length).trim();
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
