import React, { useMemo, useState } from 'react';
import { Package, MapPin, Weight, DollarSign, Clock, ShieldCheck, Tag, Info, User, Phone } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface ParcelCalculatorProps {
  onConfirm: (data: any) => void;
}

const SERVICE_TYPES = [
  { id: 'express', label: 'Express (90 min)', fee: 120 },
  { id: 'same_day', label: 'Same Day', fee: 0 },
  { id: 'next_day', label: 'Next Day', fee: 0 },
  { id: 'scheduled', label: 'Scheduled', fee: 40 },
];

export default function ParcelCalculator({ onConfirm }: ParcelCalculatorProps) {
  const [step, setStep] = useState(1);
  const [size, setSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  const [weight, setWeight] = useState<string>('1');
  const [packageType, setPackageType] = useState('document');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupContactPhone, setPickupContactPhone] = useState('');
  const [dropoffContactName, setDropoffContactName] = useState('');
  const [dropoffContactPhone, setDropoffContactPhone] = useState('');
  const [serviceType, setServiceType] = useState<'express' | 'same_day' | 'next_day' | 'scheduled'>('same_day');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet' | 'card'>('cash');

  const distance = pickup && dropoff ? 9.5 : 0; // km (demo)

  const pricing = useMemo(() => {
    const baseFare = 80;
    const distanceFare = distance * 12;
    const weightVal = Number(weight) || 0;
    const weightSurcharge = weightVal * 6;
    const sizeMultipliers = { small: 1, medium: 1.4, large: 1.9, xlarge: 2.5 };
    const sizeMultiplier = sizeMultipliers[size];
    const insuranceFee = hasInsurance ? (baseFare + distanceFare) * 0.05 : 0;
    const expressFee = SERVICE_TYPES.find((s) => s.id === serviceType)?.fee ?? 0;
    const subtotal = (baseFare + distanceFare + weightSurcharge) * sizeMultiplier + insuranceFee + expressFee;
    const totalBeforeDiscount = Math.max(0, subtotal - discount);
    const vat = totalBeforeDiscount * 0.15;
    const total = totalBeforeDiscount + vat;

    return {
      baseFare,
      distanceFare,
      weightSurcharge,
      sizeMultiplier,
      insuranceFee,
      expressFee,
      discount,
      vat,
      total,
    };
  }, [distance, weight, size, hasInsurance, discount, serviceType]);

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'ZEMEN20') {
      setDiscount(60);
      setError('');
    } else if (promoCode.toUpperCase() === 'ZEMEN10') {
      setDiscount(35);
      setError('');
    } else {
      setDiscount(0);
      setError('Invalid promo code');
    }
  };

  const handleNext = () => {
    if (step === 1 && (!pickup || !dropoff || !pickupContactName || !dropoffContactName)) {
      setError('Please complete pickup and drop-off details.');
      return;
    }
    if (step === 2 && (!weight || !packageType)) {
      setError('Please complete parcel details.');
      return;
    }
    setError('');
    setStep((prev) => prev + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff || !pickupContactName || !dropoffContactName) {
      setError('Please complete pickup and drop-off details.');
      return;
    }
    if (serviceType === 'scheduled' && !scheduledTime) {
      setError('Please choose a scheduled time.');
      return;
    }
    setError('');
    onConfirm({
      pickup,
      dropoff,
      pickupContactName,
      pickupContactPhone,
      dropoffContactName,
      dropoffContactPhone,
      packageType,
      size,
      weight,
      serviceType,
      scheduledTime,
      notes,
      hasInsurance,
      promoCode,
      pricing,
      paymentMethod,
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[#2A1B7A] flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-[#F28C3A]" /> Parcel Calculator
        </h2>
        <div className="text-xs text-gray-400">Step {step} of 3</div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" /> Pickup Location
                  </label>
                  <Input required value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Enter pickup address" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" /> Drop-off Location
                  </label>
                  <Input required value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Enter drop-off address" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" /> Pickup Contact Name
                  </label>
                  <Input required value={pickupContactName} onChange={(e) => setPickupContactName(e.target.value)} placeholder="Contact person" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" /> Pickup Contact Phone
                  </label>
                  <Input value={pickupContactPhone} onChange={(e) => setPickupContactPhone(e.target.value)} placeholder="+251 911 ..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" /> Drop-off Contact Name
                  </label>
                  <Input required value={dropoffContactName} onChange={(e) => setDropoffContactName(e.target.value)} placeholder="Recipient name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" /> Drop-off Contact Phone
                  </label>
                  <Input value={dropoffContactPhone} onChange={(e) => setDropoffContactPhone(e.target.value)} placeholder="+251 911 ..." />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-700">Parcel Size</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['small', 'medium', 'large', 'xlarge'].map((s) => (
                    <div
                      key={s}
                      onClick={() => setSize(s as any)}
                      className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${size === s ? 'border-[#F28C3A] bg-[#F28C3A]/5' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <Package className={`h-8 w-8 mx-auto mb-2 ${size === s ? 'text-[#F28C3A]' : 'text-gray-400'}`} />
                      <span className="capitalize font-medium text-sm">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Weight className="h-4 w-4 text-gray-400" /> Weight (kg)
                  </label>
                  <Input type="number" step="0.1" min="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="1.0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Package Type</label>
                  <select
                    className="w-full h-12 rounded-xl border border-gray-300 px-3 bg-white"
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                  >
                    <option value="document">Document</option>
                    <option value="electronics">Electronics</option>
                    <option value="food">Food</option>
                    <option value="fragile">Fragile</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-700">Service Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SERVICE_TYPES.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setServiceType(s.id as any)}
                      className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${serviceType === s.id ? 'border-[#2A1B7A] bg-[#2A1B7A]/5' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <Clock className={`h-5 w-5 ${serviceType === s.id ? 'text-[#2A1B7A]' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {serviceType === 'scheduled' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Schedule Time</label>
                  <Input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Delivery Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[90px] rounded-xl border border-gray-300 px-3 py-2"
                  placeholder="Add any pickup or drop-off instructions"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  id="insurance"
                  className="w-5 h-5 rounded text-[#F28C3A] focus:ring-[#F28C3A]"
                  checked={hasInsurance}
                  onChange={(e) => setHasInsurance(e.target.checked)}
                />
                <label htmlFor="insurance" className="flex-1 flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#F28C3A]" /> Add Package Insurance
                  </span>
                  <span className="text-xs text-gray-500">5% of subtotal</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#F7F7FB] p-4 rounded-xl border border-gray-100">
                <h4 className="text-sm font-semibold text-[#2A1B7A]">Delivery Summary</h4>
                <p className="text-sm text-gray-500 mt-2">{pickup} → {dropoff}</p>
                <p className="text-xs text-gray-400 mt-1">{packageType} • {size} • {weight} kg</p>
              </div>

              <div className="flex items-center gap-3">
                <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Promo code" />
                <Button type="button" variant="outline" onClick={handleApplyPromo}>
                  <Tag className="h-4 w-4" /> Apply
                </Button>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <Info className="h-4 w-4" /> Use ZEMEN20 or ZEMEN10
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['cash', 'wallet', 'card'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method as any)}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium capitalize ${paymentMethod === method ? 'border-[#F28C3A] bg-[#F28C3A]/10 text-[#F28C3A]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">Card payments are enabled in demo mode.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setStep((prev) => Math.max(1, prev - 1))}>
              Back
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={handleNext} className="bg-[#F28C3A] hover:bg-[#F28C3A]/90">
                Continue
              </Button>
            ) : (
              <Button type="submit" className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">
                Confirm Request
              </Button>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 h-fit space-y-6">
          <h3 className="font-bold text-lg text-[#2A1B7A]">Price Breakdown</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Base Fare</span>
              <span>{pricing.baseFare.toFixed(2)} ETB</span>
            </div>
            {distance > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Distance ({distance} km)</span>
                <span>{pricing.distanceFare.toFixed(2)} ETB</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Weight Surcharge</span>
              <span>{pricing.weightSurcharge.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Size Multiplier</span>
              <span>x{pricing.sizeMultiplier}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Service Fee</span>
              <span>{pricing.expressFee.toFixed(2)} ETB</span>
            </div>
            {hasInsurance && (
              <div className="flex justify-between text-gray-600">
                <span>Insurance</span>
                <span>{pricing.insuranceFee.toFixed(2)} ETB</span>
              </div>
            )}
            {pricing.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Promo Discount</span>
                <span>-{pricing.discount.toFixed(2)} ETB</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>VAT (15%)</span>
              <span>{pricing.vat.toFixed(2)} ETB</span>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
            <span className="font-bold text-[#2A1B7A]">Total</span>
            <span className="text-xl font-bold text-[#F28C3A]">{pricing.total.toFixed(2)} ETB</span>
          </div>
        </div>
      </form>
    </div>
  );
}
