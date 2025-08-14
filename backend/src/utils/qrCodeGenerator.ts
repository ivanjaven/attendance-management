import { QRSecurityService } from "../services/qrSecurityService";
import QRCode from "qrcode";

export class QRCodeGenerator {
  /**
   * Generate QR code image for a student (for printing on ID cards)
   */
  static async generateStudentQRCode(qrToken: string): Promise<string> {
    try {
      const secureQRData = QRSecurityService.generateQRCodeForPrinting(qrToken);

      // Generate QR code as base64 image with correct options
      const qrCodeImage = await QRCode.toDataURL(secureQRData, {
        errorCorrectionLevel: "M",
        type: "image/png",
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 200,
      });

      return qrCodeImage;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate QR code: ${errorMessage}`);
    }
  }

  /**
   * Generate multiple QR codes for batch student card printing
   */
  static async generateBatchQRCodes(
    students: Array<{ id: number; qr_token: string; student_id: string }>
  ): Promise<Array<{ studentId: string; qrCodeImage: string }>> {
    const results = [];

    for (const student of students) {
      try {
        const qrCodeImage = await this.generateStudentQRCode(student.qr_token);
        results.push({
          studentId: student.student_id,
          qrCodeImage,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `Failed to generate QR for student ${student.student_id}:`,
          errorMessage
        );
        // Continue with other students
      }
    }

    return results;
  }

  /**
   * Generate QR code as buffer (for direct file saving)
   */
  static async generateStudentQRCodeBuffer(qrToken: string): Promise<Buffer> {
    try {
      const secureQRData = QRSecurityService.generateQRCodeForPrinting(qrToken);

      const qrCodeBuffer = await QRCode.toBuffer(secureQRData, {
        errorCorrectionLevel: "M",
        type: "png",
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 200,
      });

      return qrCodeBuffer;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate QR code buffer: ${errorMessage}`);
    }
  }

  /**
   * Generate QR code with custom size and options
   */
  static async generateCustomQRCode(
    qrToken: string,
    options: {
      width?: number;
      margin?: number;
      darkColor?: string;
      lightColor?: string;
    } = {}
  ): Promise<string> {
    try {
      const secureQRData = QRSecurityService.generateQRCodeForPrinting(qrToken);

      const qrCodeImage = await QRCode.toDataURL(secureQRData, {
        errorCorrectionLevel: "M",
        type: "image/png",
        margin: options.margin || 1,
        color: {
          dark: options.darkColor || "#000000",
          light: options.lightColor || "#FFFFFF",
        },
        width: options.width || 200,
      });

      return qrCodeImage;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate custom QR code: ${errorMessage}`);
    }
  }
}
