export interface PhiScanResult {
  hasPhiViolation: boolean;
  detectedTypes: string[];
  sanitizedText: string;
}

export class PhiSanitizerService {
  // Regex patterns matching sensitive patient identifiers
  private static MRN_REGEX = /\b(MRN|MR#|RECORD|REG|ID)[\s:#-]*([0-9]{4,10})\b/gi;
  private static PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  private static SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
  private static EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  private static PATIENT_NAME_REGEX = /\b(patient name|pt name|patient:)\s+([A-Z][a-z]+ [A-Z][a-z]+)\b/gi;

  public static scanAndSanitize(text: string): PhiScanResult {
    const detected: string[] = [];
    let sanitized = text;

    if (this.MRN_REGEX.test(text)) {
      detected.push('Medical Record Number (MRN)');
      sanitized = sanitized.replace(this.MRN_REGEX, '[REDACTED_MRN]');
    }

    if (this.PHONE_REGEX.test(text)) {
      detected.push('Direct Telephone / Mobile Number');
      sanitized = sanitized.replace(this.PHONE_REGEX, '[REDACTED_PHONE]');
    }

    if (this.SSN_REGEX.test(text)) {
      detected.push('National Identity / Social Security Number');
      sanitized = sanitized.replace(this.SSN_REGEX, '[REDACTED_NATIONAL_ID]');
    }

    if (this.EMAIL_REGEX.test(text)) {
      detected.push('Patient Email Address');
      sanitized = sanitized.replace(this.EMAIL_REGEX, '[REDACTED_EMAIL]');
    }

    if (this.PATIENT_NAME_REGEX.test(text)) {
      detected.push('Direct Patient Name Label');
      sanitized = sanitized.replace(this.PATIENT_NAME_REGEX, 'Patient: [ANONYMIZED_PATIENT]');
    }

    return {
      hasPhiViolation: detected.length > 0,
      detectedTypes: detected,
      sanitizedText: sanitized,
    };
  }
}
