import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementBanner?: string;
  announcementBannerActive: boolean;
  allowedRegistrationRoles: string[];
  maxUploadSizeMb: number;
  featureFlags: {
    enableGoogleAuth: boolean;
    enableJobApplications: boolean;
    enableCredentialVerification: boolean;
    enableMessaging: boolean;
    enableObserverAccess: boolean;
  };
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: 'DocIn is undergoing scheduled maintenance. We will be back shortly.',
    },
    announcementBanner: { type: String, default: '' },
    announcementBannerActive: { type: Boolean, default: false },
    allowedRegistrationRoles: {
      type: [String],
      default: ['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'OBSERVER'],
    },
    maxUploadSizeMb: { type: Number, default: 10 },
    featureFlags: {
      enableGoogleAuth: { type: Boolean, default: true },
      enableJobApplications: { type: Boolean, default: true },
      enableCredentialVerification: { type: Boolean, default: true },
      enableMessaging: { type: Boolean, default: true },
      enableObserverAccess: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);

/**
 * Get the singleton settings document, create if doesn't exist
 */
export const getSystemSettings = async (): Promise<ISystemSettings> => {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({});
  }
  return settings;
};
