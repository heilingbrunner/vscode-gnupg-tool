import * as vscode from 'vscode';
import { isDirectory } from './utils';
import { isKeyRingDirectory } from './gnupglib';

export class Configuration {
  platform: string;
  homedir?: string;

  constructor() {
    this.platform = process.platform;

    let config = vscode.workspace.getConfiguration('GnuPG');
    let homedir = String(config.get<string>('homedir'));
    let uri = vscode.Uri.file(homedir);
    if (isKeyRingDirectory(uri)) {
      this.homedir = uri.fsPath;
    }
  }
}
