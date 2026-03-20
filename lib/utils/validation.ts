export function validatePDF(file: File): { valid: boolean; error?: string } {
  // TODO: Validate MIME/type and file size (max 20MB), ensure application/pdf.
  void file;
  return { valid: true };
}

export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  // TODO: Basic format validation (E.164-ish).
  void phone;
  return { valid: true };
}

export function validateOTP(code: string): { valid: boolean; error?: string } {
  // TODO: OTP must be 6 digits.
  void code;
  return { valid: true };
}

