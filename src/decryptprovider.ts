import * as vscode from 'vscode';
import * as fs from 'fs';
import { decrypt } from 'gpg';

export default class DecryptProvider implements vscode.TextDocumentContentProvider {

    private static s_instance?: DecryptProvider = undefined;
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    constructor() {
        if (DecryptProvider.s_instance) {
            DecryptProvider.s_instance.dispose();
        }
        DecryptProvider.s_instance = this;
    }

    static get instance() {
        return DecryptProvider.s_instance;
    }

    public dispose() {
        this._onDidChange.dispose();
        if (DecryptProvider.s_instance) {
            DecryptProvider.s_instance.dispose();
            DecryptProvider.s_instance = undefined;
        }
    }

    public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        return new Promise(async (resolve, reject) => {
            let somecheck = 'ok';
            if (somecheck === 'ok') {

                let content = this.getContent(uri);
                let args = ['--decrypt'];

                decrypt(content, args, (err: string, result: string) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.toString());
                    }
                });
            } else {
                return resolve('[decryption cancelled]');
            }
        });
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }

    getContent(uri: vscode.Uri): string {

        let filepath = '';
        let buffer: Buffer | undefined;

        if (uri.scheme === 'gpg-decrypt') {
            // remove the pseudo '.decrypted' extension, create new uri
            filepath = uri.with({ scheme: 'file' }).fsPath.slice(0, -('.decrypted'.length));
            buffer = fs.readFileSync(filepath);
        }

        return (buffer !== undefined) ? buffer.toString() : '';
    }

}