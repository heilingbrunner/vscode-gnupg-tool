import * as vscode from 'vscode';
import * as cp from 'child_process';
import { GnuPGKey } from "./gnupgkey";
import { i18n } from "./i18n";
import {
  readFile,
  writeFile,
  statSync
} from 'fs';

export function getContent(uri: vscode.Uri): Promise<Buffer> {
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

export function setContent(uri: vscode.Uri, content: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // fs.writeFileSync(newUri.fsPath, encrypted);
    writeFile(uri.fsPath, content, err => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}

export function getWorkspaceUri(): vscode.Uri | undefined {
  let uri = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined;
  return uri;
}

export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch (e) {
    if (e.code === 'ENOENT') {
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
    if (e.code === 'ENOENT') {
      return false;
    } else {
      throw e;
    }
  }
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

export function filterKeys(keys: Map<string, GnuPGKey>, predicate: (k: GnuPGKey) => boolean): Array<GnuPGKey> {
  return Array.from(keys.values()).filter(k => predicate(k));
}

export function runInTerminal(command: string) {
  const terminal = vscode.window.createTerminal(i18n().GnuPGTerminal);
  terminal.show();
  terminal.sendText(command, false);
}

export function copyToClipboard(text: string) {
  switch (process.platform) {
    case 'darwin':
      cp.exec('echo ' + text + ' | pbcopy');
      break;
    case 'win32':
      cp.exec('echo ' + text + ' | clip');
      break;
    case 'linux':
      cp.exec('echo ' + text + ' | xclip -selection c');
      break;
    default:
      throw new Error(i18n().GnuPGNotSupportedPlatform + "'" + process.platform + "'");
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
