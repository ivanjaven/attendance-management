// backend/src/services/qrSecurityService.ts
import crypto from "crypto";

interface QRCodeData {
  encoded_token: string;
  checksum: string;
}

export class QRSecurityService {
  private static readonly SECRET_SALT =
    process.env.QR_SECRET_SALT || "your-super-secret-salt-2024";
  private static readonly HASH_LENGTH = 16;
  private static readonly CHECKSUM_LENGTH = 8;

  static generateQRCodeForPrinting(qrToken: string): string {
    const encodedToken = this.encodeToken(qrToken);
    const checksum = this.generateChecksum(encodedToken);

    const qrData: QRCodeData = {
      encoded_token: encodedToken,
      checksum: checksum,
    };

    return Buffer.from(JSON.stringify(qrData)).toString("base64");
  }

  static async validateAndDecodeQRCode(
    scannedData: string
  ): Promise<string | null> {
    try {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(scannedData)) {
        return null;
      }

      const decodedJson = Buffer.from(scannedData, "base64").toString("utf8");
      const qrData: QRCodeData = JSON.parse(decodedJson);

      if (!qrData.encoded_token || !qrData.checksum) {
        return null;
      }

      const expectedChecksum = this.generateChecksum(qrData.encoded_token);
      if (qrData.checksum !== expectedChecksum) {
        return null;
      }

      return await this.findOriginalToken(qrData.encoded_token);
    } catch (error) {
      return null;
    }
  }

  private static encodeToken(qrToken: string): string {
    return crypto
      .createHmac("sha256", this.SECRET_SALT)
      .update(qrToken)
      .digest("hex")
      .substring(0, this.HASH_LENGTH);
  }

  private static generateChecksum(encodedToken: string): string {
    return crypto
      .createHash("md5")
      .update(encodedToken + this.SECRET_SALT)
      .digest("hex")
      .substring(0, this.CHECKSUM_LENGTH);
  }

  private static async findOriginalToken(
    encodedToken: string
  ): Promise<string | null> {
    const { supabase } = await import("../config/database");

    const { data: students, error } = await supabase
      .from("students")
      .select("qr_token")
      .is("deleted_at", null);

    if (error || !students) {
      return null;
    }

    for (const student of students) {
      const testEncodedToken = this.encodeToken(student.qr_token);
      if (testEncodedToken === encodedToken) {
        return student.qr_token;
      }
    }

    return null;
  }

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
