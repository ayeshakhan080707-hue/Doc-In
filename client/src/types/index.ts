export type UserRole = 
  | 'OBSERVER'
  | 'DOCTOR' 
  | 'HOSPITAL_ADMIN' 
  | 'RECRUITER' 
  | 'CREDENTIALING_OFFICER' 
  | 'SUPER_ADMIN';

export type SubscriptionTier = 'FREE' | 'PREMIUM_GOLD';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  bannerUrl?: string;
  subscriptionTier: SubscriptionTier;
  isClinicalVerified: boolean;
  status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
}

export interface DoctorProfile {
  _id?: string;
  userId: string | User;
  fullName: string;
  headline: string;
  specialization: string;
  subSpecialties?: string[];
  medicalLicenseNumber?: string;
  licensingBody?: string;
  yearsOfExperience: number;
  about?: string;
  city?: string;
  country?: string;
  hospitalAffiliations?: Array<{
    hospitalName: string;
    position: string;
    isCurrent: boolean;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  procedures?: string[];
  profileViewsCount: number;
  searchAppearancesCount: number;
}

export interface CredentialDocument {
  _id: string;
  userId: string | User;
  documentType: 'MEDICAL_LICENSE' | 'DEGREE_CERTIFICATE' | 'FELLOWSHIP' | 'EXPERIENCE_LETTER' | 'RESUME';
  fileUrl: string;
  originalFileName: string;
  ocrExtractedData: {
    rawText: string;
    licenseNumber?: string;
    doctorNameFound?: string;
    issuingAuthority?: string;
    degreeFound?: string;
    issueDate?: string;
    expiryDate?: string;
    confidenceScore: number;
  };
  userConfirmedData: {
    licenseNumber?: string;
    issuingAuthority?: string;
    degree?: string;
    expiryDate?: string;
  };
  verificationStatus: 'DRAFT_EXTRACTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  reviewedBy?: any;
  reviewedAt?: string;
  createdAt: string;
}

export interface PostComment {
  _id?: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  headline?: string;
  text: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  authorId: User;
  content: string;
  isClinicalCase: boolean;
  phiSanitizedConfirmed: boolean;
  medicalSpecialty?: string;
  attachments?: Array<{
    url: string;
    type: 'IMAGE' | 'PDF' | 'VIDEO';
  }>;
  likes: string[];
  comments: PostComment[];
  sharesCount: number;
  tags?: string[];
  createdAt: string;
  // Repost fields
  isRepostedByMe?: boolean;
  _isRepost?: boolean;
  _repostId?: string;
  _repostedBy?: User;
  _repostedAt?: string;
}

export interface JobPosting {
  _id: string;
  employerId: string;
  title: string;
  institutionName: string;
  department: string;
  specializationRequired: string;
  minimumExperienceYears: number;
  location: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'LOCUM' | 'FELLOWSHIP';
  salaryRange?: string;
  description: string;
  clinicalVerificationRequired: boolean;
  applicantsCount: number;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  recipientId: string;
  type: 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'POST_LIKE' | 'POST_COMMENT' | 'CREDENTIAL_STATUS' | 'JOB_ALERT';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  _id?: string;
  invoiceNumber: string;
  userId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  billingDate: string;
  paidAt?: string;
  paymentMethod: {
    brand: string;
    last4: string;
  };
  customerDetails: {
    fullName: string;
    email: string;
    role: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

export interface BillingDetails {
  currentPlan: {
    tier: 'FREE' | 'PREMIUM_GOLD';
    planName: string;
    price: number;
    billingCycle: string;
    status: string;
    nextBillingDate: string;
    paymentMethod: { brand: string; last4: string } | null;
  };
  invoices: Invoice[];
}
