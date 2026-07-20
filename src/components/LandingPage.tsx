import { motion } from 'motion/react';
import { ShieldAlert, Lock, Smartphone, ShieldCheck, Zap, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard' | 'admin') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-on-surface font-body selection:bg-accent/20">
      {/* Top Navigation Bar */}
      <nav className="w-full top-0 sticky z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant">
        <div className="flex justify-between items-center h-20 px-6 md:px-16 max-w-7xl mx-auto">
          <div 
            onClick={() => onNavigate('landing')}
            className="font-headline text-2xl font-bold text-primary tracking-tight cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <ShieldCheck className="w-8 h-8 text-accent" />
            SecureAuth
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => onNavigate('admin')}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold px-3 py-1.5 rounded border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              Admin Console
            </button>
            <button 
              onClick={() => onNavigate('login')}
              className="font-medium text-on-surface-variant hover:text-accent transition-colors duration-200 cursor-pointer"
            >
              Login
            </button>
            <button 
              onClick={() => onNavigate('register')}
              className="bg-primary text-white font-medium px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all active:scale-95 font-bold shadow-sm cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-24 md:pb-32">
          {/* Background Decorative Element (Subtle Gradient) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-40 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent"></div>
          </div>
          
          <div className="container mx-auto px-6 md:px-16 text-center relative z-10">
            {/* Hero Visual */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12 flex justify-center"
            >
              <div className="w-24 h-24 md:w-28 md:h-28 border border-outline bg-white rounded-2xl flex items-center justify-center shield-pulse relative">
                <ShieldAlert className="text-primary w-12 h-12 md:w-16 md:h-16" />
                {/* Subtle orbit */}
                <div className="absolute inset-[-12px] border border-accent/10 rounded-full animate-pulse"></div>
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-6 max-w-4xl mx-auto leading-tight tracking-tight"
            >
              Secure Access, Verified Every Time
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg md:text-xl text-on-surface-variant mb-12 max-w-2xl mx-auto font-light leading-relaxed"
            >
              Stronger account protection using enterprise-grade password and OTP verification systems.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
            >
              <button 
                onClick={() => onNavigate('register')}
                className="w-full sm:w-auto bg-primary text-white font-headline font-semibold text-lg px-8 py-4 rounded-lg shadow-lg shadow-primary/10 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto border border-outline bg-white text-primary font-headline font-semibold text-lg px-8 py-4 rounded-lg hover:bg-surface-light transition-all active:scale-95 cursor-pointer"
              >
                Login
              </button>
            </motion.div>
          </div>
        </section>

        {/* Trust Indicators Section */}
        <section className="bg-surface-light border-y border-outline-variant py-16">
          <div className="max-w-6xl mx-auto px-6 md:px-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              {/* Indicator 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-14 h-14 rounded-full bg-white border border-outline flex items-center justify-center mb-6 group-hover:border-accent group-hover:text-accent transition-all duration-300 shadow-sm">
                  <Lock className="text-primary group-hover:text-accent w-6 h-6 transition-colors" />
                </div>
                <h3 className="font-headline text-sm text-primary uppercase tracking-widest font-semibold mb-2">
                  Password Encryption
                </h3>
                <p className="text-on-surface-variant text-sm md:text-base">
                  AES-256 bit military-grade standards.
                </p>
              </motion.div>

              {/* Indicator 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-14 h-14 rounded-full bg-white border border-outline flex items-center justify-center mb-6 group-hover:border-accent group-hover:text-accent transition-all duration-300 shadow-sm">
                  <Smartphone className="text-primary group-hover:text-accent w-6 h-6 transition-colors" />
                </div>
                <h3 className="font-headline text-sm text-primary uppercase tracking-widest font-semibold mb-2">
                  OTP Verification
                </h3>
                <p className="text-on-surface-variant text-sm md:text-base">
                  Multi-factor identity confirmation.
                </p>
              </motion.div>

              {/* Indicator 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-14 h-14 rounded-full bg-white border border-outline flex items-center justify-center mb-6 group-hover:border-accent group-hover:text-accent transition-all duration-300 shadow-sm">
                  <ShieldCheck className="text-primary group-hover:text-accent w-6 h-6 transition-colors" />
                </div>
                <h3 className="font-headline text-sm text-primary uppercase tracking-widest font-semibold mb-2">
                  Secure Sessions
                </h3>
                <p className="text-on-surface-variant text-sm md:text-base">
                  Real-time threat monitoring.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Detailed Feature Grid (Bento Style) */}
        <section className="py-20 px-6 md:px-16 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Major Feature */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="md:col-span-8 bg-white rounded-2xl border border-outline p-8 md:p-10 relative overflow-hidden group hover:border-accent/30 transition-colors"
            >
              <div className="relative z-10">
                <span className="text-accent font-mono text-xs uppercase tracking-wider block mb-3 font-semibold">Enterprise Security</span>
                <h3 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-4">Zero-Trust Infrastructure</h3>
                <p className="text-on-surface-variant text-sm md:text-base max-w-md leading-relaxed">
                  Our architecture ensures that every request is authenticated, authorized, and continuously validated for security configuration and integrity.
                </p>
              </div>
              {/* Decorative pattern */}
              <div className="absolute -right-16 -bottom-16 w-64 h-64 border-4 border-surface-light rounded-full group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
            </motion.div>

            {/* Highlight Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-4 bg-primary rounded-2xl p-8 md:p-10 flex flex-col justify-end text-white relative overflow-hidden group shadow-md"
            >
              <Zap className="w-10 h-10 mb-6 text-accent animate-pulse" />
              <h3 className="font-headline text-xl md:text-2xl font-bold mb-2">Fast Deployment</h3>
              <p className="text-sm opacity-85 leading-relaxed">
                Integrate SecureAuth into your existing workflow in minutes, not days.
              </p>
            </motion.div>

            {/* Stats Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-4 bg-surface-light rounded-2xl border border-outline p-8 flex flex-col items-center justify-center text-center group hover:border-accent/20 transition-colors"
            >
              <div className="mb-4 text-accent font-mono text-xs font-semibold border border-accent/20 px-3 py-1 rounded-full bg-white">
                LIVE UPTIME
              </div>
              <div className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight mb-2">
                99.99%
              </div>
              <p className="text-sm text-on-surface-variant">
                Reliability guaranteed by SLA.
              </p>
            </motion.div>

            {/* Reporting Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="md:col-span-8 bg-white rounded-2xl border border-outline p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 hover:border-accent/30 transition-colors"
            >
              <div className="hidden md:block w-1/3">
                <div className="aspect-[4/3] bg-surface-light border border-outline rounded-xl p-4 flex flex-col gap-3 shadow-inner">
                  <div className="h-2 w-full bg-outline rounded-full"></div>
                  <div className="h-2 w-3/4 bg-outline rounded-full"></div>
                  <div className="h-2 w-full bg-accent/40 rounded-full"></div>
                  <div className="mt-auto h-8 w-full bg-white rounded border border-outline-variant flex items-center px-2">
                    <div className="w-2 h-2 rounded-full bg-dark-teal mr-2 animate-ping"></div>
                    <div className="text-[10px] font-mono text-on-surface-variant">monitoring events...</div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-accent" />
                  <h3 className="font-headline text-xl md:text-2xl font-bold text-primary">Advanced Reporting</h3>
                </div>
                <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">
                  Detailed audit logs and real-time security alerts delivered to your dashboard with granular filtering.
                </p>
              </div>
            </motion.div>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 bg-white border-t border-outline-variant mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-16 max-w-7xl mx-auto gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="font-headline text-xl text-primary font-bold">SecureAuth</span>
            <span className="hidden md:block h-4 w-px bg-outline"></span>
            <span className="text-xs text-on-surface-variant text-center md:text-left">
              © 2026 SecureAuth. Precise Security Engineering.
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            <button className="text-xs text-on-surface-variant hover:text-accent transition-colors cursor-pointer">Privacy Policy</button>
            <button className="text-xs text-on-surface-variant hover:text-accent transition-colors cursor-pointer">Terms of Service</button>
            <button className="text-xs text-on-surface-variant hover:text-accent transition-colors cursor-pointer">Security Whitepaper</button>
            <button className="text-xs text-on-surface-variant hover:text-accent transition-colors cursor-pointer">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
