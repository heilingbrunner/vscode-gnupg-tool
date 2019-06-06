export class GnuPGParameters {
  //  gpg
  //  [--homedir name]
  //  [--options file]
  //  [options]
  //  command
  //  [args]
  private static _homedir: string | undefined;

  static sethomedir(path: string | undefined){
    GnuPGParameters._homedir = path;
  } 

  static get homedir(): string[] {
    let parameters: string[] = [];

    if (GnuPGParameters._homedir) {
      parameters = parameters.concat(['--homedir', GnuPGParameters._homedir]);
    }

    return parameters;
  }
}
