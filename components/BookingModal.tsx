
import React, { useState, useEffect } from 'react';
import { apiCreateBooking } from '../services/api';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useSnackbar } from '../contexts/SnackbarContext';

interface BookingModalProps {
  provider: User;
  currentUser: User;
  serviceTitle?: string;
  postId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ provider, currentUser, serviceTitle, postId, onClose, onSuccess }) => {
  const { t } = useLanguage();
  const { showSnackbar } = useSnackbar();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'qpay' | 'socialpay' | 'card'>('card');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5); // 5 second simulation timer

  const price = provider.pricePerDay || 100; // Default price if not set
  const total = price * guests;

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Handle countdown for mock payment
  useEffect(() => {
      let timer: any;
      if (step === 'payment' && countdown > 0) {
          timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else if (step === 'payment' && countdown === 0) {
          finalizeBooking();
      }
      return () => clearTimeout(timer);
  }, [step, countdown]);

  const handlePayClick = () => {
    if (!date) {
        showSnackbar("Please select a date", 'warning');
        return;
    }
    setStep('payment');
  };

  const finalizeBooking = async () => {
    setLoading(true);
    try {
        await apiCreateBooking({
            providerId: provider._id,
            providerName: provider.name,
            customerId: currentUser._id,
            serviceTitle: serviceTitle,
            postId: postId,
            date: date,
            guests: guests,
            totalPrice: total,
            paymentMethod: paymentMethod
        });
        onSuccess();
        onClose();
        showSnackbar("Payment Successful! Booking Confirmed.", 'success');
    } catch (e) {
        showSnackbar("Booking failed. Please try again.", 'error');
        setStep('details');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-slide-up sm:animate-none">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-lg dark:text-white">{step === 'payment' ? 'Scan to Pay' : t('book_now')}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            
            {step === 'details' ? (
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('select_date')}</label>
                        <input 
                            type="date" 
                            min={new Date().toISOString().split('T')[0]}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('guests')}</label>
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                            <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 bg-white dark:bg-slate-700 rounded-full shadow-sm text-primary font-bold">-</button>
                            <span className="flex-1 text-center font-bold dark:text-white">{guests}</span>
                            <button onClick={() => setGuests(guests + 1)} className="w-8 h-8 bg-white dark:bg-slate-700 rounded-full shadow-sm text-primary font-bold">+</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('payment_method')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => setPaymentMethod('qpay')}
                                className={`p-2 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 ${paymentMethod === 'qpay' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 dark:text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">qr_code_scanner</span> QPay
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('socialpay')}
                                className={`p-2 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 ${paymentMethod === 'socialpay' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 dark:text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">payments</span> SocialPay
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('card')}
                                className={`p-2 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 ${paymentMethod === 'card' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 dark:text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">credit_card</span> Card
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center mt-2">
                        <span className="text-sm text-slate-500">{t('total')}</span>
                        <span className="text-xl font-bold text-primary">${total}</span>
                    </div>

                    <button 
                        onClick={handlePayClick}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2"
                    >
                        {t('pay_book')}
                    </button>
                </div>
            ) : (
                <div className="p-8 flex flex-col items-center text-center">
                    <p className="text-sm text-slate-500 mb-4">Scan this QR code with your bank app to pay <strong>${total}</strong></p>
                    
                    <div className="w-48 h-48 bg-white border-2 border-slate-200 p-2 rounded-xl mb-6 relative overflow-hidden">
                        {/* Mock QR Code Pattern */}
                        <div className="w-full h-full bg-slate-900" style={{
                            maskImage: 'url(https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg)',
                            maskSize: 'cover'
                        }}></div>
                        
                        {/* Loading Overlay */}
                        {loading && (
                             <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                             </div>
                        )}
                    </div>

                    <p className="font-bold text-lg mb-2 dark:text-white">Processing Payment...</p>
                    <p className="text-xs text-slate-400">Simulation: Auto-confirming in {countdown}s</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default BookingModal;
