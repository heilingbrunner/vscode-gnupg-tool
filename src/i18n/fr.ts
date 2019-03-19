import { Ii18n } from "../i18n";

const translation: Ii18n = {
  Decrypted: 'déchiffré',
  Encrypted: 'crypté',
  GnuPGDecryptionFailed: 'GnuPG: Le déchiffrement a échoué !',
  GnuPGEncryptionFailed: 'GnuPG: Le chiffrement a échoué !',
  GnuPGEndSessionFailed: 'GnuPG: Fin de session a échoué !',
  GnuPGEndSessionSuccessfully: 'GnuPG: La session s\'est terminée avec succès.',
  GnuPGFileAlreadyEncrypted: 'GnuPG: Fichier déjà crypté (*.asc|*.gpg).',
  GnuPGFileDecryptedSuccessfully: 'GnuPG: Fichier décrypté avec succès.',
  GnuPGFileEncryptedSuccessfully: 'GnuPG: Fichier crypté avec succès.',
  GnuPGFileIsAlreadyASignature: 'GnuPG: Le fichier est déjà une signature (*.sig).',
  GnuPGFileIsNotASignature: 'GnuPG: Le fichier n\'est pas une signature (*.sig).',
  GnuPGFileNotEncrypted: 'GnuPG: Fichier non crypté (*.asc|*.gpg).',
  GnuPGFileSignedSuccessfully: 'GnuPG: Fichier signé avec succès',
  GnuPGGpgNotAvailable: 'GnuPG: gpg indisponible !',
  GnuPGKeyExportFailed: 'GnuPG: L\'exportation de clé a échoué !',
  GnuPGKeyExportSuccessfully: 'GnuPG: Exportation de clé avec succès !',
  GnuPGKeyImportFailed: 'GnuPG: L\'importation de clé a échoué !',
  GnuPGKeyImportSuccessfully: 'GnuPG: Importation de clé réussie !',
  GnuPGNoRecipientsSelectedForEncryption: 'GnuPG: Aucun destinataire sélectionné pour le cryptage.',
  GnuPGNoTextSelectedForDecryption: 'GnuPG: Aucun texte sélectionné pour le déchiffrement.',
  GnuPGNoTextSelectedForEncryption: 'GnuPG: Aucun texte sélectionné pour le cryptage.',
  GnuPGSignFailed: 'GnuPG: Échec de la signature !',
  GnuPGVerfication: 'GnuPG: Vérification',
  GnuPGVerficationFailed: 'GnuPG: Échec de la vérification !',
  SelectKeyToExport: 'Sélectionnez la clé à exporter ...',
  SelectRecipients: 'Sélectionner les destinataires ...',
  SelectSigner: 'Sélectionner le signataire ...',
  Verified: 'vérifié'
};

export default translation;
