import * as vscode from 'vscode';
export class GnuPGGlobal {
  //  gpg
  //  [--homedir name]
  //  [--options file]
  //  [options]
  //  command
  //  [args]

  private static _available: boolean = false;
  private static _homedir?: string;
  private static _majorVersion: number;
  private static _minorVersion: number;
  private static _patchVersion: number;

  static set available(available: boolean) {
    GnuPGGlobal._available = available;
  }

  static get available(): boolean {
    return GnuPGGlobal._available;
  }

  static set homedir(path: string | undefined) {
    GnuPGGlobal._homedir = path;
  }
  static get homedir(): string | undefined {
    return GnuPGGlobal._homedir;
  }

  static setVersion(version: string | undefined) {
    if (version) {
      const match = version.match(/(\d+)\.(\d+).(\d+)/);
      if (match && match.length === 4) {
        GnuPGGlobal._majorVersion = parseInt(match[1]);
        GnuPGGlobal._minorVersion = parseInt(match[2]);
        GnuPGGlobal._patchVersion = parseInt(match[3]);
      }
    }
  }

  static get majorVersion(): number {
    return GnuPGGlobal._majorVersion;
  }

  static get minorVersion(): number {
    return GnuPGGlobal._minorVersion;
  }

  static get patchVersion(): number {
    return GnuPGGlobal._patchVersion;
  }

  static get defaultargs(): string[] {
    let parameters: string[] = [];

    //default parameters ...
    parameters = parameters.concat(['--batch', '--yes']);

    if (GnuPGGlobal._homedir) {
      parameters = parameters.concat(['--homedir', GnuPGGlobal._homedir]);
    }

    return parameters;
  }

  static get IsVersion1(): boolean {
    return (GnuPGGlobal._majorVersion === 1);
  }

  static get IsVersion2(): boolean {
    return (GnuPGGlobal._majorVersion === 2);
  }
}
