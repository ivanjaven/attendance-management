// backend/src/services/qrSecurityService.ts
import crypto from "crypto";

interface QRCodeData {
  encoded_token: string;
  checksum: string;
}

export class QRSecurityService {
  private static readonly SECRET_SALT =
    process.env.QR_SECRET_SALT || "your-super-secret-salt-2024";
  private static readonly HASH_LENGTH = 16; // Length of the encoded token
  private static readonly CHECKSUM_LENGTH = 8; // Length of checksum for validation

  /**
   * Generate secure QR code data for printing on student IDs
   * This method is used when creating/printing student ID cards
   */
  static generateQRCodeForPrinting(qrToken: string): string {
    const encodedToken = this.encodeToken(qrToken);
    const checksum = this.generateChecksum(encodedToken);

    const qrData: QRCodeData = {
      encoded_token: encodedToken,
      checksum: checksum,
    };

    // Return base64 encoded JSON for QR code
    return Buffer.from(JSON.stringify(qrData)).toString("base64");
  }

  /**
   * Validate and decode scanned QR code data
   * Returns the original qr_token if valid, null if invalid
   */
  static async validateAndDecodeQRCode(
    scannedData: string
  ): Promise<string | null> {
    try {
      // Decode the base64 JSON
      const decodedJson = Buffer.from(scannedData, "base64").toString("utf8");
      const qrData: QRCodeData = JSON.parse(decodedJson);

      if (!qrData.encoded_token || !qrData.checksum) {
        return null;
      }

      // Validate checksum
      const expectedChecksum = this.generateChecksum(qrData.encoded_token);
      if (qrData.checksum !== expectedChecksum) {
        return null; // QR code has been tampered with
      }

      // Find the original token by testing against all active students
      return await this.findOriginalToken(qrData.encoded_token);
    } catch (error) {
      console.error("QR validation error:", error);
      return null;
    }
  }

  /**
   * Encode the original qr_token into a secure hash
   */
  private static encodeToken(qrToken: string): string {
    return crypto
      .createHmac("sha256", this.SECRET_SALT)
      .update(qrToken)
      .digest("hex")
      .substring(0, this.HASH_LENGTH);
  }

  /**
   * Generate checksum for data integrity validation
   */
  private static generateChecksum(encodedToken: string): string {
    return crypto
      .createHash("md5")
      .update(encodedToken + this.SECRET_SALT)
      .digest("hex")
      .substring(0, this.CHECKSUM_LENGTH);
  }

  /**
   * Find original qr_token by testing encoded token against all active students
   * This is necessary since hashing is one-way
   */
  private static async findOriginalToken(
    encodedToken: string
  ): Promise<string | null> {
    const { supabase } = await import("../config/database");

    // Get all active students with their qr_tokens
    const { data: students, error } = await supabase
      .from("students")
      .select("qr_token")
      .is("deleted_at", null);

    if (error || !students) {
      return null;
    }

    // Test each student's qr_token to see if it produces the scanned encoded_token
    for (const student of students) {
      const testEncodedToken = this.encodeToken(student.qr_token);
      if (testEncodedToken === encodedToken) {
        return student.qr_token;
      }
    }

    return null;
  }

  /**
   * Validate QR code format without decoding (for quick validation)
   */
  static isValidQRFormat(scannedData: string): boolean {
    try {
      const decodedJson = Buffer.from(scannedData, "base64").toString("utf8");
      const qrData = JSON.parse(decodedJson);

      return (
        typeof qrData.encoded_token === "string" &&
        typeof qrData.checksum === "string" &&
        qrData.encoded_token.length === this.HASH_LENGTH &&
        qrData.checksum.length === this.CHECKSUM_LENGTH
      );
    } catch {
      return false;
    }
  }
}
