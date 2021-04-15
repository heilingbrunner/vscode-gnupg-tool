import en from './i18n/en';
import de from './i18n/de';
import es from './i18n/es';
import fr from './i18n/fr';
import ru from './i18n/ru';
import zh_CN from './i18n/zh-CN';

export interface Ii18n {
  AllFiles: string;
  CommandCheckGnuPG: string;
  CommandClearSignFile: string;
  CommandCopyFingerprintToClipboard: string;
  CommandCopyKeyIdToClipboard: string;
  CommandDecrypt: string;
  CommandDecryptFile: string;
  CommandDecryptPreview: string;
  CommandDecryptSelection: string;
  CommandDeletePublicKey: string;
  CommandDeleteSecretKey: string;
  CommandEditPublicKey: string;
  CommandEncrypt: string;
  CommandEncryptFileAsym: string;
  CommandEncryptFileSymm: string;
  CommandEncryptPreviewAsym: string;
  CommandEncryptPreviewSymm: string;
  CommandEncryptSelectionAsym: string;
  CommandEncryptSelectionSymm: string;
  CommandEndSession: string;
  CommandEnvironment: string;
  CommandExportPublicKeys: string;
  CommandExportSecretKeys: string;
  CommandExportSecretSubKeys: string;
  CommandGenerateKey: string;
  CommandGitSetUserSigningKey: string;
  CommandGitUnsetUserSigningKey: string;
  CommandKeys: string;
  CommandImportKeys: string;
  CommandListPublicKeys: string;
  CommandListSecretKeys: string;
  CommandShowSmartcard: string;
  CommandSignFile: string;
  CommandTrust: string;
  CommandVerifyFile: string;
  Decrypted: string;
  Encrypted: string;
  GnuPGCopyFingerprintToClipboardFailed: string;
  GnuPGCopyKeyIdToClipboardFailed: string;
  GnuPGDecryptionFailed: string;
  GnuPGDeleteKeyFailed: string;
  GnuPGDeleteSecretKeyFailed: string;
  GnuPGEditPublicKeyFailed: string;
  GnuPGEncryptionFailed: string;
  GnuPGEndSessionFailed: string;
  GnuPGEndSessionSuccessfully: string;
  GnuPGFileAlreadyEncrypted: string;
  GnuPGFileDecryptedSuccessfully: string;
  GnuPGFileEncryptedSuccessfully: string;
  GnuPGFileIsAlreadyASignature: string;
  GnuPGFileIsNotASignature: string;
  GnuPGFileNotEncrypted: string;
  GnuPGFileSignedSuccessfully: string;
  GnuPGGnuPGNotAvailable: string;
  GnuPGKeyExportFailed: string;
  GnuPGKeyExportSuccessfully: string;
  GnuPGKeyImportFailed: string;
  GnuPGKeyImportSuccessfully: string;
  GnuPGListPublicKeysFailed: string;
  GnuPGListSecretKeysFailed: string;
  GnuPGNotAvailable: string;
  GnuPGNoRecipientsSelectedForEncryption: string;
  GnuPGNoTextSelectedForDecryption: string;
  GnuPGNoTextSelectedForEncryption: string;
  GnuPGFunctionIsNotSupportedWithVersion1x: string;
  GnuPGFunctionIsNotSupportedWithVersion2x: string;
  GnuPGGitSetUserSigningKeyFailed: string;
  GnuPGGitUnsetUserSigningKeyFailed: string;
  GnuPGNotSupportedPlatform: string;
  GnuPGPublicKey: string;
  GnuPGPublicKeyDeletedSuccessfully: string;
  GnuPGSecretKey: string;
  GnuPGSecretKeyDeletedSuccessfully: string;
  GnuPGSelectPublicKey: string;
  GnuPGSelectSigningKey: string;
  GnuPGShowSmartcardFailed: string;
  GnuPGSignFailed: string;
  GnuPGSwitchToTerminalAndHitReturn: string;
  GnuPGTerminal: string;
  GnuPGUsingHomedir: string;
  GnuPGVerfication: string;
  GnuPGVerficationFailed: string;
  SelectKeyToExport: string;
  SelectRecipients: string;
  SelectSigner: string;
  Verified: string;
}

export function i18n(): Ii18n {
  let curr: Ii18n;
  let config: { locale: string } = { locale: 'en' };

  if (process.env.VSCODE_NLS_CONFIG) {
    let VSCODE_NLS_CONFIG = process.env.VSCODE_NLS_CONFIG;
    config = JSON.parse(VSCODE_NLS_CONFIG);
  }

  switch (config.locale) {
    case 'en':
      curr = en;
      break;

    case 'de':
      curr = de;
      break;

    case 'es':
      curr = es;
      break;

    case 'fr':
      curr = fr;
      break;

    case 'ru':
      curr = ru;
      break;

    case 'zh-CN':
      curr = zh_CN;
      break;

    default:
      curr = en;
  }

  return curr;
}
