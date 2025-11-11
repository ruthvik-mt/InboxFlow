import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Zap,
  Search,
  Brain,
  Database,
  Bell,
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  TrendingUp,
  Sparkles
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Real-Time Synchronization",
      description: "Connect multiple email accounts with instant IMAP synchronization for seamless inbox management"
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "Powerful Search Engine",
      description: "Find any email instantly with advanced Elasticsearch-powered search and filtering capabilities"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Intelligent Categorization",
      description: "AI automatically organizes your emails into meaningful categories for better productivity"
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: "Smart Notifications",
      description: "Get instant alerts for important emails with customizable notification preferences"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Spam Protection",
      description: "Advanced filtering keeps unwanted emails out of your inbox automatically"
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "Secure Storage",
      description: "All your emails are encrypted and stored securely with enterprise-grade infrastructure"
    }
  ];

  const stats = [
    { number: "10K+", label: "Emails Processed" },
    { number: "99.9%", label: "Uptime" },
    { number: "<50ms", label: "Search Speed" },
    { number: "5+", label: "Email Accounts" }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="z-10 border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
              src="/OneMail.png"
              alt="Logo"
              className="w-10 h-10"
              />
              <div>
                <span className="text-2xl font-bold">InboxFlow</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#benefits" className="text-gray-300 hover:text-white transition-colors">Benefits</a>
              <a href="#security" className="text-gray-300 hover:text-white transition-colors">Security</a>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            AI Powerd
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Email Aggregator
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Manage multiple email accounts in one place with AI-powered organization,
            lightning-fast search and intelligent automation
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all flex items-center gap-3 shadow-lg shadow-blue-600/50"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all border border-gray-700">
              Learn More
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">{stat.number}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="relative z-10 container mx-auto px-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
            <div className="bg-gray-900 px-6 py-3 border-b border-gray-700 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="p-8">
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">142</div>
                  <div className="text-xs text-gray-400 mt-1">Interested</div>
                </div>
                <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">28</div>
                  <div className="text-xs text-gray-400 mt-1">Meetings</div>
                </div>
                <div className="bg-gray-600/10 border border-gray-600/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400">53</div>
                  <div className="text-xs text-gray-400 mt-1">Not Interested</div>
                </div>
                <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">12</div>
                  <div className="text-xs text-gray-400 mt-1">Spam</div>
                </div>
                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">8</div>
                  <div className="text-xs text-gray-400 mt-1">Auto Reply</div>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">Real-time email synchronization active</span>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 bg-gray-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful features designed to transform how you manage emails
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {features.map((feature, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredFeature(idx)}
                onMouseLeave={() => setHoveredFeature(null)}
                className="group bg-gray-800/50 border border-gray-700 rounded-xl p-8 hover:border-blue-600 transition-all hover:bg-gray-800 cursor-pointer"
              >
                <div className="bg-blue-600/10 w-16 h-16 rounded-lg flex items-center justify-center mb-6 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Why Choose InboxFlow?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Unified Inbox Management</h3>
                    <p className="text-gray-400">Access all your email accounts from a single, intuitive interface</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">AI-Powered Efficiency</h3>
                    <p className="text-gray-400">Let artificial intelligence handle categorization and prioritization</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Lightning Fast Search</h3>
                    <p className="text-gray-400">Find any email in milliseconds with advanced search technology</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Enterprise Security</h3>
                    <p className="text-gray-400">Bank-level encryption keeps your communications private and secure</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/20 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-green-400">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Save 5+ hours per week</span>
                  </div>
                  <div className="flex items-center gap-3 text-blue-400">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm font-medium">50% faster email processing</span>
                  </div>
                  <div className="flex items-center gap-3 text-purple-400">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-medium">95% accurate AI categorization</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-3xl p-12 text-center shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Ready to Transform Your Inbox?
            </h2>
            <p className="text-lg text-gray-800 mb-10 max-w-2xl mx-auto">
              Join thousands of professionals managing their emails smarter with InboxFlow
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-black text-white px-10 py-5 rounded-lg font-bold text-lg hover:bg-gray-900 transition-all inline-flex items-center gap-3 shadow-lg"
            >
              Start Using InboxFlow
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-gray-800 ">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img
               src="/OneMail.png"
               alt="Logo"
               className="w-10 h-10"
               />
              <span className="text-xl font-bold">InboxFlow</span>
            </div>
            <p className="text-gray-400 text-sm text-center">
              © 2025 InboxFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;