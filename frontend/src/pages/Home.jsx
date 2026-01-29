import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { WobbleCard } from "../components/ui/wobble-card";
import { motion } from "motion/react";
import { Suspense } from "react";
import {
  UploadIcon,
  AIIcon,
  DebateIcon,
  StudentIcon,
  ResearcherIcon,
  LearnerIcon,
  ArrowRightIcon,
} from "../components/ui/home-icons";

// Auth-dependent CTA button - wrapped in Suspense
const AuthCTAButton = ({ dashboardText = "Go to Dashboard", signupText = "Get Started Free" }) => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <Link
      to="/dashboard"
      className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-black bg-yellow-400 rounded-xl hover:bg-yellow-300 hover:scale-105 transition-all duration-300 shadow-lg shadow-yellow-400/25"
    >
      {dashboardText}
      <ArrowRightIcon />
    </Link>
  ) : (
    <Link
      to="/signup"
      className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-black bg-yellow-400 rounded-xl hover:bg-yellow-300 hover:scale-105 transition-all duration-300 shadow-lg shadow-yellow-400/25"
    >
      {signupText}
      <ArrowRightIcon />
    </Link>
  );
};

// CTA button skeleton fallback
const CTAButtonSkeleton = () => (
  <div className="inline-flex items-center justify-center px-8 py-4 bg-yellow-400/50 rounded-xl animate-pulse">
    <div className="w-32 h-6 bg-yellow-300/50 rounded" />
  </div>
);

const Home = () => {
  return (
    <div className="bg-neutral-950 min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950" />
        
        {/* Subtle radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-yellow-400/5 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Transform Documents into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
              Structured Debates
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-300 mb-8 max-w-2xl mx-auto">
            Upload PDFs and let AI analyze them into clear summaries and balanced debates. 
            Understand multiple perspectives in minutes, not hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Auth-dependent CTA - wrapped in Suspense */}
            <Suspense fallback={<CTAButtonSkeleton />}>
              <AuthCTAButton />
            </Suspense>
            <Link
              to="/about"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border border-neutral-700 rounded-xl hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-300"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section className="py-24 px-4 bg-neutral-900 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Three simple steps to transform your documents into structured insights
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative group"
            >
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-8 text-center h-full hover:border-yellow-400/50 transition-colors duration-300">
                <div className="w-16 h-16 bg-yellow-400/10 rounded-xl flex items-center justify-center mx-auto mb-6 text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                  <UploadIcon />
                </div>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-bold px-4 py-1 rounded-full text-sm">
                  Step 1
                </span>
                <h3 className="text-xl font-semibold text-white mb-3">Upload Your PDF</h3>
                <p className="text-neutral-400">
                  Simply drag and drop or select your PDF document. We support research papers, articles, essays, and more.
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative group"
            >
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-8 text-center h-full hover:border-yellow-400/50 transition-colors duration-300">
                <div className="w-16 h-16 bg-yellow-400/10 rounded-xl flex items-center justify-center mx-auto mb-6 text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                  <AIIcon />
                </div>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-bold px-4 py-1 rounded-full text-sm">
                  Step 2
                </span>
                <h3 className="text-xl font-semibold text-white mb-3">AI Analyzes Content</h3>
                <p className="text-neutral-400">
                  Our AI reads and understands your document, extracting key arguments, themes, and perspectives.
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative group"
            >
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-8 text-center h-full hover:border-yellow-400/50 transition-colors duration-300">
                <div className="w-16 h-16 bg-yellow-400/10 rounded-xl flex items-center justify-center mx-auto mb-6 text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                  <DebateIcon />
                </div>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-bold px-4 py-1 rounded-full text-sm">
                  Step 3
                </span>
                <h3 className="text-xl font-semibold text-white mb-3">Get Structured Debates</h3>
                <p className="text-neutral-400">
                  Receive a balanced debate with arguments and counter-arguments, helping you understand all sides.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-24 px-4 bg-neutral-950 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Everything you need to analyze and understand complex documents
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <WobbleCard
              containerClassName="col-span-1 lg:col-span-2 bg-gradient-to-br from-yellow-500 to-yellow-600 min-h-[300px]"
            >
              <div className="max-w-md">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  AI-Powered Debate Generation
                </h3>
                <p className="text-yellow-100 text-base sm:text-lg">
                  Our intelligent AI doesn't just summarize—it structures your content into balanced debates with clear arguments on multiple sides of any topic.
                </p>
              </div>
            </WobbleCard>

            <WobbleCard containerClassName="col-span-1 bg-gradient-to-br from-neutral-800 to-neutral-900 min-h-[300px]">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Smart Summaries</h3>
                <p className="text-neutral-300">Get comprehensive summaries that capture the essence of your documents in seconds.</p>
              </div>
            </WobbleCard>

            <WobbleCard containerClassName="col-span-1 bg-gradient-to-br from-neutral-800 to-neutral-900 min-h-[300px]">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Secure & Private</h3>
                <p className="text-neutral-300">Your documents are processed securely. We never share your data with third parties.</p>
              </div>
            </WobbleCard>

            <WobbleCard containerClassName="col-span-1 lg:col-span-2 bg-gradient-to-br from-purple-600 to-indigo-700 min-h-[300px]">
              <div className="max-w-md">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Multiple Perspectives</h3>
                <p className="text-purple-100 text-base sm:text-lg">
                  Understand every angle of a complex topic. Our AI identifies and presents different viewpoints to give you a complete picture.
                </p>
              </div>
            </WobbleCard>
          </motion.div>
        </div>
      </section>

      {/* ===== WHO IT'S FOR SECTION ===== */}
      <section className="py-24 px-4 bg-neutral-900 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for Curious Minds
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Whether you're studying, researching, or just learning—Debatrium helps you understand faster
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-8 text-center hover:border-yellow-400/50 transition-colors duration-300"
            >
              <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <StudentIcon />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Students</h3>
              <p className="text-neutral-400">
                Quickly understand source material for essays, assignments, and exam preparation. Identify key arguments and potential counter-arguments.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true, amount: 0.3 }}
              className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-8 text-center hover:border-yellow-400/50 transition-colors duration-300"
            >
              <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <ResearcherIcon />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Researchers</h3>
              <p className="text-neutral-400">
                Analyze dense academic papers and articles. Get a high-level overview and identify the main lines of reasoning before diving deep.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true, amount: 0.3 }}
              className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-8 text-center hover:border-yellow-400/50 transition-colors duration-300"
            >
              <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <LearnerIcon />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Lifelong Learners</h3>
              <p className="text-neutral-400">
                Curious about various topics? Efficiently consume and understand content from e-books, reports, and articles.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== CTA FOOTER SECTION ===== */}
      <section className="py-24 px-4 bg-neutral-950 overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
            className="bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-3xl p-12 text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Transform How You Learn?
            </h2>
            <p className="text-neutral-300 text-lg mb-8 max-w-2xl mx-auto">
              Join Debatrium today and start turning complex documents into clear, balanced insights.
            </p>
            {/* Auth-dependent CTA - wrapped in Suspense */}
            <Suspense fallback={<CTAButtonSkeleton />}>
              <AuthCTAButton dashboardText="Go to Dashboard" signupText="Get Started Free" />
            </Suspense>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
