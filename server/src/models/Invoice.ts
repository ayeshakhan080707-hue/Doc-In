import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  userId: mongoose.Types.ObjectId;
  planName: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  billingDate: Date;
  paidAt?: Date;
  paymentMethod: {
    brand: string;
    last4: string;
  };
  customerDetails: {
    fullName: string;
    email: string;
    role: string;
  };
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['PAID', 'PENDING', 'FAILED', 'REFUNDED'],
      default: 'PAID',
    },
    billingDate: { type: Date, default: Date.now },
    paidAt: { type: Date, default: Date.now },
    paymentMethod: {
      brand: { type: String, default: 'Visa' },
      last4: { type: String, default: '4242' },
    },
    customerDetails: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, default: 'DOCTOR' },
    },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
