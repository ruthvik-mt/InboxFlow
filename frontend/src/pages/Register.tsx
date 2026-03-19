import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, ArrowLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, sendOTP } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [step, setStep] = useState(1); // 1: Info, 2: OTP
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    setError('');
    
    if (!formData.email || !formData.name || !formData.password) {
      setError('Please fill in all details first');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Access keys do not match');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must be 8+ characters with uppercase, number, and symbol');
      return;
    }

    setLoading(true);
    try {
      await sendOTP(formData.email);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleSendOTP();
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, otp);
      navigate('/login', { state: { message: 'Registration successful! You can now login.' } });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [50, -50, 50],
            y: [30, -30, 30]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
            x: [-30, 30, -30],
            y: [-50, 50, -50]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/3 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10 py-12"
      >
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-2 text-gray-500 hover:text-white mb-4 transition-all text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-1 tracking-tight">Create Account</h1>
          <p className="text-gray-400 text-sm">Join the AI intelligence network</p>
        </div>

        {/* Registration Card */}
        <div className="bg-gray-900/40 backdrop-blur-2xl rounded-3xl border border-gray-800/50 p-5 md:p-6 shadow-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors" />
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-4 rounded-2xl mb-8 flex items-center gap-3 overflow-hidden"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-4 rounded-2xl mb-6 flex items-center gap-3 overflow-hidden"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Full Name</label>
                    <div className="relative group/input">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 bg-gray-950/50 border border-gray-800/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none text-white transition-all text-sm font-medium placeholder:text-gray-700"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Email Address</label>
                    <div className="relative group/input">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 bg-gray-950/50 border border-gray-800/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none text-white transition-all text-sm font-medium placeholder:text-gray-700"
                        placeholder="name@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Password</label>
                    <div className="relative group/input mb-1">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 bg-gray-950/50 border border-gray-800/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none text-white transition-all text-sm font-medium placeholder:text-gray-700"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    {formData.password.length > 0 && (
                      <div className="space-y-2 mt-4 px-1">
                        {[
                          { label: "At least 8 characters", met: formData.password.length >= 8 },
                          { label: "At least 1 lowercase letter", met: /[a-z]/.test(formData.password) },
                          { label: "At least 1 uppercase letter", met: /[A-Z]/.test(formData.password) },
                          { label: "At least 1 number", met: /\d/.test(formData.password) },
                          { label: "At least 1 special symbol", met: /[@$!%*?&]/.test(formData.password) }
                        ].map((req, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center border",
                              req.met ? "bg-green-500/20 border-green-500/50 text-green-500" : "bg-gray-900/50 border-gray-800 text-gray-600"
                            )}>
                              {req.met && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span className={cn("text-[10px] font-medium", req.met ? "text-green-500/90" : "text-gray-500")}>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Confirm Password</label>
                    <div className="relative group/input">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 bg-gray-950/50 border border-gray-800/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none text-white transition-all text-sm font-medium placeholder:text-gray-700"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 pt-4"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                      <Mail className="w-8 h-8 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold">Verify your email</h2>
                    <p className="text-sm text-gray-400 px-4">
                      We've sent a 6-digit code to <span className="text-white font-bold">{formData.email}</span>
                    </p>
                    <button 
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setOtp('');
                      }}
                      className="text-xs text-blue-500 hover:text-blue-400 font-bold uppercase tracking-widest mt-2"
                    >
                      Change Email
                    </button>
                  </div>

                  <div className="space-y-2 text-center">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-500">Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-3xl font-black tracking-[1em] py-4 bg-gray-950/50 border border-gray-800/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none text-white transition-all"
                      placeholder="000000"
                      required
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-[0.98] mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{step === 1 ? 'Sending OTP...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <span>{step === 1 ? 'Send OTP' : 'Complete Registration'}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-800/50 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
