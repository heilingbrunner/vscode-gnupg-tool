import { Uri, workspace } from 'vscode';
import { isKeyRingDirectory } from './utils';

export class Configuration {
  platform: string;
  homedir?: string;

  constructor() {
    this.platform = process.platform;

    let config = workspace.getConfiguration('GnuPG');
    let homedir = String(config.get<string>('homedir'));
    let uri = Uri.file(homedir);
    if (isKeyRingDirectory(uri)) {
      this.homedir = uri.fsPath;
    }
  }
}
