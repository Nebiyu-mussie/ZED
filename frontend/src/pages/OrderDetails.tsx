import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Phone, User, AlertTriangle, ShieldCheck, CheckCircle, Truck, Receipt, Star } from 'lucide-react';
import { apiFetch, formatCurrency, formatShortDate } from '../lib/api';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { getSocket } from '../lib/socket';

const STATUS_FLOW = ['confirmed', 'driver_assigned', 'picked_up', 'in_transit', 'delivered', 'completed'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  driver_assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  picked_up: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  returned: 'bg-orange-100 text-orange-800 border-orange-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['admin', 'manager', 'super_admin'].includes(user.role);
  const isDispatcher = user.role === 'dispatcher';
  const isStaff = isAdmin || isDispatcher;

  const [order, setOrder] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [driver, setDriver] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState({ category: 'damaged', description: '' });
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingTags, setRatingTags] = useState<string[]>([]);
  const [ratingNote, setRatingNote] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const fetchDetails = async () => {
    try {
      const data = await apiFetch(`/api/orders/${id}/details`);
      setOrder(data.order);
      setEvents(data.events);
      setDriver(data.driver);
      setCustomer(data.customer);
      setTickets(data.tickets || []);
      setRatings(data.ratings || []);
      if (isStaff) {
        const driverList = await apiFetch('/api/drivers');
        setDrivers(driverList);
      }
    } catch (error: any) {
      toast.push({ title: 'Unable to load order', description: error.error || '', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const socket = getSocket();
    socket.on('order_updated', (updated: any) => {
      if (updated.id === Number(id)) {
        setOrder(updated);
      }
    });
    return () => {
      socket.off('order_updated');
    };
  }, [id]);

  const pricing = useMemo(() => {
    try {
      return order?.pricing_json ? JSON.parse(order.pricing_json) : null;
    } catch {
      return null;
    }
  }, [order]);

  const hasRated = ratings.some((r) => r.from_id === user.id);

  const handleCancel = async () => {
    if (!order) return;
    try {
      const updated = await apiFetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });
      setOrder(updated);
      toast.push({ title: 'Order cancelled', variant: 'success' });
    } catch (error: any) {
      toast.push({ title: 'Unable to cancel', description: error.error || '', variant: 'error' });
    }
  };

  const submitIssue = async () => {
    if (!order) return;
    if (order.status === 'completed') {
      toast.push({ title: 'Completed deliveries cannot be reported here', variant: 'info' });
      return;
    }
    try {
      await apiFetch(`/api/orders/${order.id}/issue`, {
        method: 'POST',
        body: JSON.stringify(issue),
      });
      toast.push({ title: 'Issue reported', variant: 'success' });
      fetchDetails();
    } catch (error: any) {
      toast.push({ title: 'Unable to report issue', description: error.error || '', variant: 'error' });
    }
  };

  const submitRating = async () => {
    if (!order) return;
    try {
      await apiFetch(`/api/orders/${order.id}/ratings`, {
        method: 'POST',
        body: JSON.stringify({
          rating: ratingValue,
          tags: ratingTags,
          note: ratingNote,
          toRole: user.role === 'customer' ? 'driver' : 'customer',
          toId: user.role === 'customer' ? order.driver_id : order.customer_id,
        }),
      });
      toast.push({ title: 'Thanks for the feedback', variant: 'success' });
      fetchDetails();
    } catch (error: any) {
      toast.push({ title: 'Unable to submit rating', description: error.error || '', variant: 'error' });
    }
  };

  const updateStatus = async (status: string) => {
    try {
      await apiFetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, otp: status === 'delivered' ? otpInput : undefined }),
      });
      toast.push({ title: 'Status updated', variant: 'success' });
      fetchDetails();
    } catch (error: any) {
      toast.push({ title: 'Unable to update status', description: error.error || '', variant: 'error' });
    }
  };

  const sendArrivedNote = async (note: string) => {
    try {
      await apiFetch(`/api/orders/${order.id}/event`, {
        method: 'POST',
        body: JSON.stringify({ note, eventType: 'arrived' }),
      });
      toast.push({ title: 'Customer notified', variant: 'success' });
    } catch (error: any) {
      toast.push({ title: 'Unable to notify', description: error.error || '', variant: 'error' });
    }
  };

  const assignDriver = async (driverId: string) => {
    try {
      await apiFetch(`/api/orders/${order.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      });
      toast.push({ title: 'Driver assigned', variant: 'success' });
      fetchDetails();
    } catch (error: any) {
      toast.push({ title: 'Assignment failed', description: error.error || '', variant: 'error' });
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading order...</div>;
  if (!order) return <div className="text-center py-12 text-gray-500">Order not found.</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm text-gray-500">Order Details</p>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">{order.tracking_code || `Order #${order.id}`}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[order.status] || STATUS_COLORS.draft}`}>
              {order.status.replace('_', ' ')}
            </span>
            {order.payment_method === 'chapa' && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${PAYMENT_STATUS_COLORS[order.payment_status] || PAYMENT_STATUS_COLORS.pending}`}>
                Payment {String(order.payment_status || 'pending').replace('_', ' ')}
              </span>
            )}
            {order.eta_text && <span className="text-xs text-gray-500">ETA: {order.eta_text}</span>}
            {order.sla_status && (
              <span className={`text-xs font-semibold ${order.sla_status === 'late' ? 'text-red-600' : order.sla_status === 'at_risk' ? 'text-orange-500' : 'text-green-600'}`}>
                {order.sla_status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          {user.role === 'customer' && ['confirmed', 'driver_assigned'].includes(order.status) && (
            <Button className="bg-[#F28C3A] hover:bg-[#F28C3A]/90" onClick={handleCancel}>Cancel Order</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-[#2A1B7A] mb-4">Status Timeline</h2>
            <div className="space-y-4">
              {STATUS_FLOW.map((status) => (
                <div key={status} className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full ${STATUS_FLOW.indexOf(order.status) >= STATUS_FLOW.indexOf(status) ? 'bg-[#F28C3A]' : 'bg-gray-200'}`} />
                  <div>
                    <p className="font-medium capitalize text-gray-800">{status.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">
                      {events.find((ev) => ev.to_status === status)?.created_at ? formatShortDate(events.find((ev) => ev.to_status === status)?.created_at) : 'Pending'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-[#2A1B7A]">Pickup</h3>
              <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin className="h-4 w-4" /> {order.pickup_address}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2"><User className="h-4 w-4" /> {order.pickup_contact_name || 'Contact pending'}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2"><Phone className="h-4 w-4" /> {order.pickup_contact_phone || 'Phone pending'}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-[#2A1B7A]">Drop-off</h3>
              <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin className="h-4 w-4" /> {order.dropoff_address}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2"><User className="h-4 w-4" /> {order.dropoff_contact_name || 'Contact pending'}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2"><Phone className="h-4 w-4" /> {order.dropoff_contact_phone || 'Phone pending'}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#2A1B7A] flex items-center gap-2"><Receipt className="h-5 w-5" /> Fee Breakdown</h3>
              <span className="text-sm text-gray-500">{formatCurrency(order.total || 0)}</span>
            </div>
            {pricing && (
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Base Fare</span><span>{formatCurrency(pricing.baseFare)}</span></div>
                <div className="flex justify-between"><span>Distance</span><span>{formatCurrency(pricing.distanceFare)}</span></div>
                <div className="flex justify-between"><span>Weight Surcharge</span><span>{formatCurrency(pricing.weightSurcharge)}</span></div>
                <div className="flex justify-between"><span>Insurance</span><span>{formatCurrency(pricing.insuranceFee)}</span></div>
                <div className="flex justify-between"><span>Service Fee</span><span>{formatCurrency(pricing.expressFee)}</span></div>
                {pricing.discount > 0 && <div className="flex justify-between text-green-600"><span>Promo Discount</span><span>-{formatCurrency(pricing.discount)}</span></div>}
                <div className="flex justify-between"><span>VAT</span><span>{formatCurrency(pricing.vat)}</span></div>
                {order.status === 'cancelled' && (
                  <>
                    <div className="flex justify-between text-red-600"><span>Cancellation Fee</span><span>{formatCurrency(order.cancellation_fee || 0)}</span></div>
                    <div className="flex justify-between text-green-600"><span>Refund</span><span>{formatCurrency(order.refund_amount || 0)}</span></div>
                  </>
                )}
              </div>
            )}
          </div>

          {order.status === 'in_transit' && user.role === 'driver' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-[#2A1B7A] flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Delivery Proof</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter OTP"
                  className="h-11 rounded-xl border border-gray-300 px-3"
                />
                <Button className="bg-[#F28C3A] hover:bg-[#F28C3A]/90" onClick={() => updateStatus('delivered')}>Confirm Delivery</Button>
              </div>
            </div>
          )}

          {user.role === 'customer' && order.proof_otp && !['delivered', 'completed'].includes(order.status) && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-[#2A1B7A] flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Delivery OTP</h3>
              <p className="text-gray-600 text-sm mt-2">Share this OTP with the driver to confirm delivery.</p>
              <p className="text-2xl font-bold text-[#F28C3A] tracking-widest mt-3">{order.proof_otp}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-semibold text-[#2A1B7A] flex items-center gap-2"><Truck className="h-5 w-5" /> Assigned Driver</h3>
            {driver ? (
              <>
                <p className="font-medium text-gray-800">{driver.name}</p>
                <p className="text-sm text-gray-500">{driver.vehicle_type || 'Vehicle'}</p>
                <p className="text-sm text-gray-600 flex items-center gap-2"><Phone className="h-4 w-4" /> {driver.phone || 'Phone pending'}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Driver not assigned yet.</p>
            )}
          </div>

          {user.role === 'driver' && customer && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-[#2A1B7A]">Customer Info</h3>
              <p className="text-sm text-gray-600 flex items-center gap-2"><User className="h-4 w-4" /> {customer.name}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2"><Phone className="h-4 w-4" /> {customer.phone || 'Phone pending'}</p>
            </div>
          )}

          {user.role === 'driver' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-[#2A1B7A]">Driver Actions</h3>
              <div className="flex flex-wrap gap-2">
                {order.status === 'driver_assigned' && (
                  <>
                    <Button variant="outline" onClick={() => sendArrivedNote('Arrived at pickup location')}>Arrived at Pickup</Button>
                    <Button className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-white" onClick={() => updateStatus('picked_up')}>Picked Up</Button>
                  </>
                )}
                {order.status === 'picked_up' && (
                  <Button className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-white" onClick={() => updateStatus('in_transit')}>Start Delivery</Button>
                )}
              </div>
            </div>
          )}

          {isStaff && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-[#2A1B7A]">Staff Actions</h3>
              <select
                className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm"
                onChange={(e) => assignDriver(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Assign driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.user_id}>{d.name} • {d.vehicle_type || 'Vehicle'}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => updateStatus('returned')}>Mark Returned</Button>
                <Button variant="outline" onClick={() => updateStatus('failed')}>Mark Failed</Button>
                <Button className="bg-[#F28C3A] hover:bg-[#F28C3A]/90 text-white" onClick={handleCancel}>Cancel Order</Button>
              </div>
            </div>
          )}

          {!isStaff && order.status !== 'completed' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-[#2A1B7A] flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Issue with delivery</h3>
              <select
                className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm"
                value={issue.category}
                onChange={(e) => setIssue({ ...issue, category: e.target.value })}
              >
                <option value="damaged">Damaged package</option>
                <option value="missing">Missing item</option>
                <option value="wrong_address">Wrong address</option>
              </select>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder="Describe the issue"
                value={issue.description}
                onChange={(e) => setIssue({ ...issue, description: e.target.value })}
              />
              <Button className="bg-[#F28C3A] hover:bg-[#F28C3A]/90" onClick={submitIssue}>Report Issue</Button>
              {tickets.length > 0 && (
                <p className="text-xs text-gray-400">Latest ticket status: {tickets[0].status}</p>
              )}
            </div>
          )}

          {order.status === 'completed' && !hasRated && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-[#2A1B7A] flex items-center gap-2"><Star className="h-5 w-5" /> Rate this delivery</h3>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRatingValue(val)}
                    className={`h-9 w-9 rounded-full border ${ratingValue >= val ? 'bg-[#F28C3A] text-white border-[#F28C3A]' : 'border-gray-200 text-gray-500'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {['late', 'rude', 'careful', 'friendly', 'smooth'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRatingTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    className={`px-3 py-1 rounded-full text-xs border ${ratingTags.includes(tag) ? 'border-[#2A1B7A] bg-[#2A1B7A]/10 text-[#2A1B7A]' : 'border-gray-200 text-gray-500'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full min-h-[70px] rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder="Share feedback"
                value={ratingNote}
                onChange={(e) => setRatingNote(e.target.value)}
              />
              <Button onClick={submitRating} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">Submit Rating</Button>
            </div>
          )}

          {hasRated && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-semibold text-[#2A1B7A] flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Feedback submitted</h3>
              <p className="text-sm text-gray-500">Thanks for helping us improve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
