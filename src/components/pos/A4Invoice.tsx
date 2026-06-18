import { forwardRef, Fragment } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CartItem, Customer } from "@/lib/types";
import { APP_NAME } from "@/lib/utils/constants";
import { calculateInclusiveTaxes } from "@/lib/utils/tax";

interface A4InvoiceProps {
  invoiceNumber: string;
  items: CartItem[];
  totalAmount: number; // Gross Subtotal
  discountAmount?: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  date: Date;
  cashierName?: string;
  customer?: Customer | null;
  bakeryName?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  showLogo?: boolean;
}

export const A4Invoice = forwardRef<HTMLDivElement, A4InvoiceProps>(
  (
    {
      invoiceNumber,
      items,
      totalAmount,
      discountAmount = 0,
      paidAmount,
      changeAmount,
      paymentMethod,
      date,
      cashierName = "Admin",
      customer,
      bakeryName = APP_NAME.toUpperCase(),
      address = "123 Main Street, Colombo, Sri Lanka",
      phone = "Tel: 011-XXXXXXX",
      email,
      logo,
      showLogo = true,
    },
    ref
  ) => {
    const finalTotal = totalAmount - discountAmount;
    const { baseAmount, ssclAmount, vatAmount } = calculateInclusiveTaxes(finalTotal);

    return (
      <div
        ref={ref}
        className="a4-invoice bg-white text-black p-6 sm:p-10 mx-auto w-full print:p-8 print:m-0"
        style={{
          fontFamily: "Arial, sans-serif",
        }}
      >
        <style type="text/css" media="print">
          {`@page { margin: 10mm; size: auto; }`}
        </style>
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-300 pb-6 mb-6">
          <div className="flex items-center gap-4">
            {showLogo && logo && (
              <img src={logo} alt="Logo" className="w-24 h-24 object-contain" />
            )}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">{bakeryName}</h1>
              <p className="text-sm text-gray-600">{address}</p>
              <p className="text-sm text-gray-600">{phone}</p>
              {email && <p className="text-sm text-gray-600">{email}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold text-gray-300 uppercase tracking-widest mb-2">Invoice</h2>
            <p className="text-sm font-medium text-gray-900">Invoice #: {invoiceNumber}</p>
            <p className="text-sm text-gray-600">Date: {formatDate(date.toISOString())}</p>
            <p className="text-sm text-gray-600">Time: {date.toLocaleTimeString()}</p>
            <p className="text-sm text-gray-600">Cashier: {cashierName}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Bill To</h3>
          {customer ? (
            <div>
              <p className="text-lg font-bold text-gray-900">{customer.name}</p>
              {customer.address && <p className="text-sm text-gray-600">{customer.address}</p>}
              {customer.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
              {customer.vat_number && <p className="text-sm text-gray-600">VAT: {customer.vat_number}</p>}
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-gray-900">Walk-in Customer</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full text-left mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-3 px-2 text-sm font-bold text-gray-900 uppercase">Item Description</th>
              <th className="py-3 px-2 text-sm font-bold text-gray-900 uppercase text-center">Qty</th>
              <th className="py-3 px-2 text-sm font-bold text-gray-900 uppercase text-right">Unit Price</th>
              <th className="py-3 px-2 text-sm font-bold text-gray-900 uppercase text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => {
              const addonsTotal = item.addons?.reduce((sum, a) => sum + a.price, 0) || 0;
              const baseUnitPrice = item.unit_price - addonsTotal;
              const baseAmount = baseUnitPrice * item.quantity;
              
              return (
                <Fragment key={idx}>
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-2 text-sm text-gray-900 font-medium">
                      <div>{item.product_name}</div>
                      {item.variant_name && (
                        <div className="text-xs text-gray-500 mt-1">
                          ({item.variant_name})
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-2 text-sm text-gray-600 text-center">{item.quantity}</td>
                    <td className="py-4 px-2 text-sm text-gray-600 text-right">
                      {formatCurrency(baseUnitPrice)}
                    </td>
                    <td className="py-4 px-2 text-sm text-gray-900 font-medium text-right">
                      {formatCurrency(baseAmount)}
                    </td>
                  </tr>
                  
                  {item.addons && item.addons.map((addon) => (
                    <tr key={`${idx}-${addon.id}`} className="hover:bg-gray-50 text-gray-600">
                      <td className="py-2 px-2 text-sm pl-6">
                        + {addon.name}
                      </td>
                      <td className="py-2 px-2 text-sm text-center">{item.quantity}</td>
                      <td className="py-2 px-2 text-sm text-right">
                        {formatCurrency(addon.price)}
                      </td>
                      <td className="py-2 px-2 text-sm font-medium text-right text-gray-900">
                        {formatCurrency(addon.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Totals Calculation */}
        <div className="flex justify-end mb-12">
          <div className="w-1/2">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900 font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between border-b border-gray-100 pb-2 text-green-600">
                  <span>Discount:</span>
                  <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              
              {/* Final Amount */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(finalTotal)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-gray-600">Amount Paid ({paymentMethod.toUpperCase()}):</span>
                <span className="text-gray-900 font-medium">{formatCurrency(paidAmount)}</span>
              </div>
              
              {(finalTotal - paidAmount) > 0 ? (
                <div className="flex justify-between pt-2 text-red-600 font-bold">
                  <span>Balance Due (Udhar):</span>
                  <span>{formatCurrency(finalTotal - paidAmount)}</span>
                </div>
              ) : (
                <div className="flex justify-between pt-2 text-gray-600">
                  <span>Change:</span>
                  <span className="font-medium">{formatCurrency(changeAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="border-t border-gray-300 pt-8 mt-auto">
          <div className="text-sm text-gray-500 text-center">
            <p className="font-bold mb-1 text-gray-700">Thank you for your business!</p>
            <p>If you have any questions regarding this invoice, please contact us at {phone}.</p>
          </div>
        </div>
      </div>
    );
  }
);

A4Invoice.displayName = "A4Invoice";
