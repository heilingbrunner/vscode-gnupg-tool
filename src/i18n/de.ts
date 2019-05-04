import { Ii18n } from '../i18n';

const translation: Ii18n = {
  CommandCheckGnuPG: 'GnuPG überprüfen',
  CommandCopyFingerprintToClipboard: 'Fingerprint in die Zwischenablage kopieren',
  CommandDecrypt: 'Entschlüsseln ...',
  CommandDecryptFile: 'Datei entschlüsseln',
  CommandDecryptPreview: 'Vorschau der entschlüsselten Datei',
  CommandDecryptSelection: 'Auswahl entschlüsseln',
  CommandEditPublicKey: 'Öffentlichen Schlüssel editieren',
  CommandEncrypt: 'Verschlüsseln ...',
  CommandEncryptFileAsym: 'Datei für Empfänger verschlüsseln',
  CommandEncryptFileSymm : 'Datei mit Passphrase verschlüsseln',
  CommandEncryptPreviewAsym: 'Vorschau der verschlüsselten Datei für Empfänger',
  CommandEncryptPreviewSymm: 'Vorschau der verschlüsselten Datei mit Passphrase',
  CommandEncryptSelectionAsym: 'Auswahl für Empfänger verschlüsseln',
  CommandEncryptSelectionSymm: 'Auswahl mit Passphrase verschlüsseln',
  CommandEndSession: 'Sitzung beenden',
  CommandEnvironment: 'Umgebung ...',
  CommandExportPublicKeys: 'Öffentliche Schlüssel exportieren',
  CommandExportSecretKeys: 'Geheime Schlüssel exportieren',
  CommandExportSecretSubKeys: 'Geheime Sub-Schlüssel exportieren',
  CommandGenerateKey: 'Schlüssel erzeugen',
  CommandKeys: 'Schlüssel ...',
  CommandImportKeys: 'Schlüssel importieren',
  CommandListPublicKeys: 'Öffentliche Schlüssel auflisten',
  CommandListSecretKeys: 'Geheime Schlüssel auflisten',
  CommandShowSmartcard: 'Smartcard anzeigen',
  CommandSignFile: 'Datei signieren',
  CommandTrust: 'Vertrauen ...',
  CommandVerifyFile: 'Datei verifizieren',
  Decrypted: 'entschlüsselt',
  Encrypted: 'verschlüsselt',
  GnuPGCopyFingerprintToClipboardFailed: 'Kopieren des Fingerprints in die Zwischenablage ist fehlgeschlagen!',
  GnuPGDecryptionFailed: 'GnuPG: Entschlüsselung fehlgeschlagen!',
  GnuPGDeleteKeyFailed: 'GnuPG: Löschen des öffentlichen Schlüssels ist fehlgeschlagen!',
  GnuPGDeleteSecretKeyFailed: 'GnuPG: Löschen des geheimen Schlüssels ist fehlgeschlagen!',
  GnuPGEditPublicKeyFailed: 'Editieren des öffentlichen Schlüssel ist fehlgeschlagen!',
  GnuPGEncryptionFailed: 'GnuPG: Verschlüsselung fehlgeschlagen!',
  GnuPGEndSessionFailed: 'GnuPG: Beenden der Sitzung fehlgeschlagen!',
  GnuPGEndSessionSuccessfully: 'GnuPG: Sitzung erfolgreich beendet.',
  GnuPGFileAlreadyEncrypted: 'GnuPG: Datei bereits verschlüsselt (*.asc|*.gpg).',
  GnuPGFileDecryptedSuccessfully: 'GnuPG: Datei erfolgreich entschlüsselt.',
  GnuPGFileEncryptedSuccessfully: 'GnuPG: Datei erfolgreich verschlüsselt.',
  GnuPGFileIsAlreadyASignature: 'GnuPG: Datei ist bereits eine Signatur (*.sig).',
  GnuPGFileIsNotASignature: 'GnuPG: Datei ist keine Signatur (*.sig).',
  GnuPGFileNotEncrypted: 'GnuPG: Datei nicht verschlüsselt (*.asc|*.gpg).',
  GnuPGFileSignedSuccessfully: 'GnuPG: Datei erfolgreich signiert.',
  GnuPGGpgNotAvailable: 'GnuPG: gpg nicht verfügbar!',
  GnuPGKeyExportFailed: 'GnuPG: Schlüsselexport fehlgeschlagen!',
  GnuPGKeyExportSuccessfully: 'GnuPG: Schlüsselexport erfolgreich.',
  GnuPGKeyImportFailed: 'GnuPG: Schlüsselimport fehlgeschlagen!',
  GnuPGKeyImportSuccessfully: 'GnuPG: Schlüsselimport erfolgreich.',
  GnuPGNoRecipientsSelectedForEncryption: 'GnuPG: Kein Empfänger für die Verschlüsselung ausgewählt.',
  GnuPGNoTextSelectedForDecryption: 'GnuPG: Kein Text für Entschlüsselung ausgewählt.',
  GnuPGNoTextSelectedForEncryption: 'GnuPG: Kein Text für Verschlüsselung ausgewählt.',
  GnuPGNotSupportedPlatform: 'GnuPG: Plattform wird nicht unterstützt',
  GnuPGPublicKeyDeletedSuccessfully: 'GnuPG: Öffentlichen Schlüssel erfolgreich gelöscht',
  GnuPGSecretKeyDeletedSuccessfully: 'GnuPG: Geheimen Schlüssel erfolgreich gelöscht',
  GnuPGSelectPublicKey: 'Öffentlichen Schlüssel auswählen ...',
  GnuPGSignFailed: 'GnuPG: Signieren fehlgeschlagen!',
  GnuPGVerfication: 'GnuPG: Verifikation',
  GnuPGVerficationFailed: 'GnuPG: Verifikation fehlgeschlagen!',
  SelectKeyToExport: 'Schlüssel für Export auswählen ...',
  SelectRecipients: 'Empfänger auswählen ...',
  SelectSigner: 'Unterzeichner auswählen ...',
  Verified: 'verifiziert'
};

export default translation;
