import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Search,
  Brain,
  Bell,
  ArrowRight,
  Shield,
  Sparkles,
  ChevronRight,
  Cpu,
  Menu,
  X as CloseIcon
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navBackground = useTransform(scrollY, [0, 50], ["rgba(0,0,0,0)", "rgba(3, 7, 18, 0.9)"]);
  const navBorder = useTransform(scrollY, [0, 50], ["rgba(255,255,255,0)", "rgba(31, 41, 55, 0.5)"]);

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-Time Sync",
      description: "Connect multiple email nodes with instant IMAP synchronization for a unified stream of data.",
      color: "blue"
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Neural Search",
      description: "Find any message in milliseconds with advanced Elasticsearch-powered vector-style searching.",
      color: "purple"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI Categorization",
      description: "Advanced LLMs automatically organize your workspace into high-priority actionable items.",
      color: "indigo"
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Smart Alerts",
      description: "Get context-aware notifications only for the emails that truly matter to your workflow.",
      color: "blue"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Privacy First",
      description: "Bank-level encryption and zero-knowledge architecture keep your communications sovereign.",
      color: "purple"
    },
    {
      icon: <Cpu className="w-6 h-6" />,
      title: "Workflow Engine",
      description: "Custom triggers and automated replies handle the repetitive tasks while you focus on deep work.",
      color: "indigo"
    }
  ];

  const stats = [
    { number: "1M+", label: "Neurons Active" },
    { number: "99.99%", label: "Uptime" },
    { number: "<20ms", label: "Latency" },
    { number: "Active", label: "AI Agent" }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -40, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px]"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Navbar */}
      <motion.nav
        style={{ backgroundColor: navBackground, borderBottomColor: navBorder }}
        className="z-50 border-b bg-transparent backdrop-blur-md sticky top-0 transition-all duration-300"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
                <img src="/OneMail.png" alt="Logo" className="w-10 h-10 relative z-10" />
              </div>
              <span className="text-2xl font-black tracking-tighter">Inbox<span className="text-blue-500">Flow</span></span>
            </motion.div>

            <div className="hidden lg:flex items-center gap-10">
              {['Features', 'Intelligence', 'Security'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm font-semibold text-gray-400 hover:text-white transition-all tracking-wide"
                >
                  {item}
                </a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <button
                onClick={() => navigate('/login')}
                className="hidden md:block text-sm font-bold text-gray-400 hover:text-white transition-all"
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="hidden sm:flex bg-white text-black hover:bg-blue-600 hover:text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-xl shadow-white/5 active:scale-95 items-center gap-2"
              >
                Sign Up
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-white"
              >
                {isMobileMenuOpen ? <CloseIcon /> : <Menu />}
              </button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-800 bg-[#030712]/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-6">
                {['Features', 'Intelligence', 'Security'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-bold text-gray-400 hover:text-white transition-all"
                  >
                    {item}
                  </a>
                ))}
                <div className="h-px bg-gray-800 my-2" />
                <button
                  onClick={() => navigate('/login')}
                  className="text-left text-lg font-bold text-gray-400 hover:text-white"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-between"
                >
                  Get Started
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-40 min-h-[85vh] flex flex-col justify-center">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Email Intelligence
            </div>

            <h1 className="text-5xl md:text-8xl lg:text-9xl font-black mb-8 leading-[0.95] tracking-tight">
              Master Your
              <br />
              <span className="text-gradient">
                Workflows
              </span>
            </h1>

            <p className="text-base md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Transcend the traditional inbox. Manage multiple streams with autonomous organization, neural search, and premium AI intelligence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                onClick={() => navigate('/register')}
                className="group w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-bold text-base md:text-lg transition-all shadow-2xl shadow-blue-600/30 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-20 md:mt-32 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto p-1 border-y border-white/5 py-10 md:py-12"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center group">
                <div className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight group-hover:text-blue-400 transition-colors">
                  {stat.number}
                </div>
                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-24">
            <div className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-4">Features</div>
            <h2 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
              Everything you need for <br />
              <span className="text-gray-600">Total Inbox Control</span>
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              We've engineered the fastest, most intelligent platform for modern professionals who live in their inbox.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-gray-900/40 backdrop-blur-md border border-gray-800/50 rounded-3xl p-10 hover:border-blue-500/50 transition-all hover:bg-gray-900/60 cursor-default relative overflow-hidden"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-all group-hover:scale-110",
                  feature.color === 'blue' ? "bg-blue-500/10 text-blue-400" :
                    feature.color === 'purple' ? "bg-purple-500/10 text-purple-400" :
                      "bg-indigo-500/10 text-indigo-400"
                )}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Decorative Elements */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500/0 to-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Intelligence Section */}
      <section id="intelligence" className="relative z-10 py-32 bg-white/[0.01]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-24">
            <div className="flex-1">
              <div className="text-purple-500 font-bold uppercase tracking-widest text-sm mb-4">AI Engine</div>
              <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight tracking-tight">
                Neural <br />
                <span className="text-gray-500">Categorization</span>
              </h2>
              <div className="space-y-10">
                {[
                  { title: "Smart Sentiment", text: "AI detects the intent and urgency behind every incoming byte." },
                  { title: "Context Mapping", text: "Emails are linked to existing threads and projects automatically." },
                  { title: "Auto-Drafting", text: "Predictive replies tailored to your personal writing style." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:border-purple-500 group-hover:text-purple-500 transition-colors">
                      0{i + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>
                      <p className="text-gray-400 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative bg-gray-900/60 backdrop-blur-2xl rounded-3xl border border-gray-800/50 p-10 overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32" />

                <div className="flex items-center gap-4 mb-10 border-b border-gray-800/50 pb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600" />
                  <div>
                    <div className="text-white font-bold text-sm">AI Agent Pro</div>
                    <div className="text-green-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Processing...</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Interested", width: "85%", color: "bg-green-500" },
                    { label: "Productive", width: "42%", color: "bg-blue-500" },
                    { label: "Filter Active", width: "98%", color: "bg-red-500" }
                  ].map((row, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                        <span>{row.label}</span>
                        <span>{row.width}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: row.width }}
                          transition={{ duration: 1.5, delay: 0.2 }}
                          className={cn("h-full rounded-full", row.color)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative z-10 py-32 bg-white/[0.01]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-24">
            <div className="flex-1">
              <div className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-4">Security</div>
              <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight tracking-tight">
                Sovereign <br />
                <span className="text-gray-500">Architecture</span>
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed mb-10">
                Your data never leaves your control. We've built a zero-knowledge infrastructure that prioritizes privacy above all else.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {[
                  { title: "End-to-End", desc: "Encryption for all data at rest and in transit." },
                  { title: "Zero-Knowledge", desc: "We can never see your content or access keys." },
                  { title: "Self-Sovereign", desc: "Export or delete your entire node instantly." },
                  { title: "Audit Logging", desc: "Every neural access is transparently logged." }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {item.title}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 bg-blue-500/10 rounded-[3rem] blur-3xl" />
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-dashed border-blue-500/20 rounded-[4rem]"
                />
                <div className="absolute inset-10 bg-gray-900/60 backdrop-blur-2xl rounded-[3rem] border border-gray-800/50 flex items-center justify-center shadow-2xl">
                  <Shield className="w-32 h-32 text-blue-500" />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 bg-blue-500/5 rounded-[3rem]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-40">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[3rem] p-10 md:p-24 text-center shadow-3xl relative overflow-hidden group"
          >
            {/* Background elements for CTA */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-[100px]"
            />

            <div className="relative z-10">
              <h2 className="text-5xl md:text-7xl font-black mb-10 text-white leading-[0.9] tracking-tight">
                Upgrade Your <br />
                Communication
              </h2>
              <p className="text-lg md:text-xl text-blue-100/80 mb-12 max-w-2xl mx-auto">
                Join our premium workspace where AI handles the noise, and you handle the meaningful connections.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto bg-white text-black hover:bg-black hover:text-white px-12 py-6 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-95"
                >
                  Start For Free
                </button>
                <div className="text-blue-200 text-xs font-bold uppercase tracking-wider hidden sm:block">
                  No credit card required
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-20 border-t border-gray-900 bg-gray-950/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-3">
              <img src="/OneMail.png" alt="Logo" className="w-8 h-8 opacity-50" />
              <span className="text-xl font-bold tracking-tight text-gray-400">Inbox<span className="text-gray-600">Flow</span></span>
            </div>

            <div className="flex gap-10">
              {['Terms', 'Privacy', 'Security', 'Contact'].map(item => (
                <button key={item} className="text-xs font-semibold text-gray-500 hover:text-white transition-colors">
                  {item}
                </button>
              ))}
            </div>

            <p className="text-gray-600 text-xs">
              &copy; 2026 InboxFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
