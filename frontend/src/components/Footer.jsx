import React, { memo } from "react";
import { Link } from "react-router-dom";

const Footer = memo(function Footer() {
  return (
    <footer className="bg-black text-white py-8 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        
        {/* Logo / Brand */}
        <div className="text-2xl font-extrabold tracking-wide">
          MWD
        </div>

        {/* Links */}
        <div className="flex space-x-6">
          <Link to="/" className="hover:text-yellow-400 transition-colors duration-300">
            Home
          </Link>
          <Link to="/about" className="hover:text-yellow-400 transition-colors duration-300">
            About Us
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} MWD. All rights reserved.
        </div>
      </div>
    </footer>
  );
});

export default Footer;