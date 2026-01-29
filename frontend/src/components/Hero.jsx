import { memo } from "react";
import { Link } from "react-router-dom";

const Hero = memo(function Hero() {
  return (
    <div
      className="w-full h-[80vh] bg-cover bg-center flex flex-col items-center justify-center text-center relative"
      style={{
        backgroundImage: "url('https://via.placeholder.com/1200x600')",
      }}
    >
      {/* Optional overlay for dark theme */}
      <div className="absolute inset-0 bg-black/50"></div>

      <div className="relative z-10 text-white px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
          Welcome to Debatrium
        </h1>
        <p className="text-lg sm:text-xl mb-6">
          Engage in meaningful debates and expand your knowledge.
        </p>

        {/* About Us Button */}
        <Link
          to="/about"
          className="bg-yellow-400 text-black font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition-colors duration-300"
        >
          About Us
        </Link>
      </div>
    </div>
  );
});

export default Hero;  