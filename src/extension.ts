import * as vscode from 'vscode';
import * as gnupgtool from './gnupgtool';

export function activate(context: vscode.ExtensionContext) {
  console.log('GnuPG Tool activated');

  //TODO:
  //Show Smartcard

  const disposableCommandCheckGnuPG = vscode.commands.registerCommand('extension.CheckGnuPG', () => {
    gnupgtool.checkGnuPG();
  });

  const disposableCommandListRecipients = vscode.commands.registerCommand('extension.ListRecipients', () => {
    gnupgtool.listRecipients();
  });

  const disposableCommandEncryptSelection = vscode.commands.registerCommand('extension.EncryptSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      gnupgtool.encryptSelection(editor);
    }
  });

  const disposableCommandDecryptSelection = vscode.commands.registerCommand('extension.DecryptSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      gnupgtool.decryptSelection(editor);
    } else {
    }
  });

  const disposableCommandEndSession = vscode.commands.registerCommand('extension.EndSession', () => {
    gnupgtool.endSession();
  });

  //Disposables
  context.subscriptions.push(disposableCommandCheckGnuPG);
  context.subscriptions.push(disposableCommandListRecipients);
  context.subscriptions.push(disposableCommandEncryptSelection);
  context.subscriptions.push(disposableCommandDecryptSelection);
  context.subscriptions.push(disposableCommandEndSession);
}

// this method is called when your extension is deactivated
export function deactivate() {}
