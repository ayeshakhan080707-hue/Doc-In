import React from 'react';
import { X, Printer, Download, CheckCircle2, Building, ShieldCheck, Mail, Calendar, FileText } from 'lucide-react';
import { Invoice } from '../../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, invoice }) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(invoice.billingDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Modal Top Bar (Action Bar - Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <FileText size={16} className="text-[#0A66C2]" />
            <span>Official Invoice / Tax Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-pill-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
            >
              <Printer size={14} />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-10 bg-white" id="printable-invoice">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded bg-[#0A66C2] flex items-center justify-center text-white font-bold text-xl tracking-tighter">
                  D<span className="text-[#CCFBF1]">i</span>
                </div>
                <span className="font-extrabold text-2xl text-gray-900 tracking-tight">
                  Doc<span className="text-[#0A66C2]">In</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-700">DocIn Healthcare Technologies, Inc.</p>
              <p className="text-xs text-gray-500">100 Medical Center Plaza, Suite 400</p>
              <p className="text-xs text-gray-500">San Francisco, CA 94143, United States</p>
              <p className="text-xs text-gray-500">Tax ID: US-EIN-94-2849102 • billing@docin.health</p>
            </div>

            <div className="sm:text-right">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">INVOICE</h1>
              <p className="text-sm font-mono font-bold text-[#0A66C2] mt-0.5">{invoice.invoiceNumber}</p>
              
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 size={13} className="text-emerald-600" />
                {invoice.status}
              </div>

              <div className="mt-3 text-xs text-gray-500 space-y-0.5">
                <p><strong>Date Issued:</strong> {formattedDate}</p>
                <p><strong>Payment Status:</strong> Settled in full</p>
              </div>
            </div>
          </div>

          {/* Billed To / Payment Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-200 text-xs">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Billed To</p>
              <p className="text-sm font-bold text-gray-900">{invoice.customerDetails.fullName}</p>
              <p className="text-gray-600 mt-0.5">{invoice.customerDetails.email}</p>
              <p className="text-gray-500 capitalize">{invoice.customerDetails.role.replace(/_/g, ' ')} • Verified Healthcare Professional</p>
              <p className="text-gray-400 mt-1">DocIn Platform Member ID: {invoice.userId?.toString().substring(0, 12)}</p>
            </div>

            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Payment Method</p>
              <div className="sm:inline-flex items-center gap-1.5 font-semibold text-gray-800">
                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] border border-gray-200 font-mono">
                  {invoice.paymentMethod?.brand || 'VISA'}
                </span>
                <span>•••• •••• •••• {invoice.paymentMethod?.last4 || '4242'}</span>
              </div>
              <p className="text-gray-500 mt-1">Currency: USD ($)</p>
              <p className="text-gray-400 text-[11px] mt-0.5">Transaction Ref: tx_{invoice.invoiceNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6 border-b border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="pb-3 font-bold">Item Description</th>
                  <th className="pb-3 text-center font-bold">Qty</th>
                  <th className="pb-3 text-right font-bold">Unit Price</th>
                  <th className="pb-3 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-4 pr-4">
                      <p className="font-bold text-gray-900 text-sm">{invoice.planName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#0A66C2]">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck size={12} /> HIPAA-Protected
                        </span>
                        <span>•</span>
                        <span>AI OCR Verification Access</span>
                        <span>•</span>
                        <span>CME Credit Tracking</span>
                      </div>
                    </td>
                    <td className="py-4 text-center font-medium">{item.quantity}</td>
                    <td className="py-4 text-right font-medium">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-4 text-right font-bold text-gray-900">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="py-6 flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax / VAT (0%)</span>
                <span className="font-medium">${invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-extrabold text-gray-900">
                <span>Total Paid</span>
                <span className="text-[#0A66C2] text-base">${invoice.total.toFixed(2)} USD</span>
              </div>
            </div>
          </div>

          {/* Compliance & Footer */}
          <div className="pt-6 border-t border-gray-100 text-[11px] text-gray-400 space-y-2">
            <div className="flex items-center gap-2 text-gray-600 font-medium">
              <ShieldCheck size={14} className="text-[#0D9488]" />
              <span>Compliant with international medical credentialing & HIPAA data safeguards</span>
            </div>
            <p>
              Thank you for being a verified member of the DocIn Healthcare Network. This receipt confirms your subscription payment.
              If you have questions regarding your billing, please contact our support team at <a href="mailto:billing@docin.health" className="text-[#0A66C2] underline">billing@docin.health</a>.
            </p>
          </div>
        </div>

        {/* Modal Bottom Footer (Hidden in Print) */}
        <div className="no-print px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">Need a specialized tax invoice format? Contact support.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-pill-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="btn-pill-outline text-xs px-4 py-1.5"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
