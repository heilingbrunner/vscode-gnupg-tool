import { Ii18n } from "../i18n";

const translation: Ii18n = {
  Decrypted: 'entschlüsselt',
  Encrypted: 'verschlüsselt',
  GnuPGDecryptionFailed: 'GnuPG: Entschlüsselung fehlgeschlagen !',
  GnuPGEncryptionFailed: 'GnuPG: Verschlüsselung fehlgeschlagen !',
  GnuPGEndSessionFailed: 'GnuPG: Beenden der Sitzung fehlgeschlagen !',
  GnuPGEndSessionSuccessfully: 'GnuPG: Sitzung erfolgreich beendet.',
  GnuPGFileAlreadyEncrypted: 'GnuPG: Datei bereits verschlüsselt (*.asc|*.gpg).',
  GnuPGFileDecryptedSuccessfully: 'GnuPG: Datei erfolgreich entschlüsselt.',
  GnuPGFileEncryptedSuccessfully: 'GnuPG: Datei erfolgreich verschlüsselt.',
  GnuPGFileIsAlreadyASignature: 'GnuPG: Datei ist bereits eine Signatur (*.sig).',
  GnuPGFileIsNotASignature: 'GnuPG: Datei ist keine Signatur (*.sig).',
  GnuPGFileNotEncrypted: 'GnuPG: Datei nicht verschlüsselt (*.asc|*.gpg).',
  GnuPGFileSignedSuccessfully: 'GnuPG: Datei erfolgreich signiert.',
  GnuPGGpgNotAvailable: 'GnuPG: gpg nicht verfügbar !',
  GnuPGKeyExportFailed: 'GnuPG: Schlüsselexport fehlgeschlagen !',
  GnuPGKeyExportSuccessfully: 'GnuPG: Schlüsselexport erfolgreich !',
  GnuPGKeyImportFailed: 'GnuPG: Schlüsselimport fehlgeschlagen !',
  GnuPGKeyImportSuccessfully: 'GnuPG: Schlüsselimport erfolgreich !',
  GnuPGNoRecipientsSelectedForEncryption: 'GnuPG: Kein Empfänger für die Verschlüsselung ausgewählt',
  GnuPGNoTextSelectedForDecryption: 'GnuPG: Kein Text für Entschlüsselung ausgewählt.',
  GnuPGNoTextSelectedForEncryption: 'GnuPG: Kein Text für Verschlüsselung ausgewählt.',
  GnuPGSignFailed: 'GnuPG: Signieren fehlgeschlagen !',
  GnuPGVerfication: 'GnuPG: Verifikation',
  GnuPGVerficationFailed: 'GnuPG: Verifikation fehlgeschlagen !',
  SelectKeyToExport: 'Schlüssel für Export auswählen ...',
  SelectRecipients: 'Empfänger auswählen ...',
  SelectSigner: 'Unterzeichner auswählen ...',
  Verified: 'verifiziert'
};

export default translation;
