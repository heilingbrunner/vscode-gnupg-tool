import * as vscode from 'vscode';
import * as fs from 'fs';

export function getContent(uri: vscode.Uri): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (uri.scheme === 'file') {
      const filepath = uri.fsPath;

      fs.readFile(filepath, (err, buffer) => {
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
    fs.writeFile(uri.fsPath, content, err => {
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
  if (vscode.workspace) {
    uri = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined;
  }
  return uri;
}
