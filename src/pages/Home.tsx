import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, FileText, Zap, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-semibold mb-6">
              <Sparkles size={14} className="text-amber-500" />
              Powered by Gemini 3.1 Pro
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6">
              Build a CV & Cover Letter <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-400">
                that gets you hired.
              </span>
            </h1>
            <p className="text-xl text-zinc-600 max-w-2xl mx-auto mb-10">
              Transform your raw experience into a professional, high-impact CV and cover letter in seconds. 
              Our AI understands your career story and polishes it to perfection.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/builder"
                className="w-full sm:w-auto px-8 py-4 bg-zinc-900 text-white rounded-full font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group"
              >
                Start Building for Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/blog"
                className="w-full sm:w-auto px-8 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-full font-semibold hover:bg-zinc-50 transition-all"
              >
                Read Career Tips
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1200&h=800" 
                alt="Professional Resume and Cover Letter" 
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 hidden md:block">
              <div className="bg-white p-4 rounded-xl shadow-lg border border-zinc-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">AI Optimized</p>
                  <p className="text-xs text-zinc-500">Ready for ATS filters</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Two Powerful Tools, One Goal</h2>
            <p className="text-zinc-500">Everything you need to land your dream job, powered by advanced AI.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100 flex flex-col items-start text-left"
            >
              <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mb-6">
                <FileText size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4">CV Builder</h3>
              <p className="text-zinc-600 mb-8 flex-grow">
                Create a professional Tanzanian-format CV tailored to your target role. Our AI optimizes your experience for ATS filters and human recruiters alike.
              </p>
              <Link to="/builder" className="inline-flex items-center gap-2 font-bold text-zinc-900 hover:gap-3 transition-all">
                Build your CV <ArrowRight size={18} />
              </Link>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100 flex flex-col items-start text-left"
            >
              <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Cover Letter Maker</h3>
              <p className="text-zinc-600 mb-8 flex-grow">
                Generate persuasive, tailored cover letters that highlight your unique value proposition for specific job descriptions and companies.
              </p>
              <Link to="/cover-letter" className="inline-flex items-center gap-2 font-bold text-zinc-900 hover:gap-3 transition-all">
                Write your letter <ArrowRight size={18} />
              </Link>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Zap,
                title: "Instant Polishing",
                description: "Our AI rewrites your messy notes into professional, high-impact bullet points."
              },
              {
                icon: FileText,
                title: "PDF Export",
                description: "Download a beautifully formatted PDF that's ready to send to recruiters."
              },
              {
                icon: Sparkles,
                title: "Smart Formatting",
                description: "No more fighting with Word margins. We handle the layout automatically."
              }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900 mb-6">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
