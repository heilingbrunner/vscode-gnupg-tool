import * as vscode from 'vscode';
import {readFile, writeFile, statSync} from 'fs';

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
  let uri: vscode.Uri | undefined;
  uri = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined;
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
