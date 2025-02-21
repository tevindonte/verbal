"use client"; 
import React, { useState } from "react";
import Link from "next/link";

export default function Nav() {
  // Mobile nav toggle
  const [navOpen, setNavOpen] = useState(false);

  // Toggle mobile menu
  const handleNav = () => {
    setNavOpen(!navOpen);
  };

  return (
    <div className="text-black bg-white font-SecularOne text-sm flex justify-between items-center h-24 max-w-[1440px] mx-auto px-4">
      {/* Logo */}
      <Link href="/">
        {/* 
          In Next.js, `require(...)` is generally not recommended. 
          If you have a local image, consider importing or using next/image. 
          For simplicity, we do a plain <img>.
        */}
        <img
          src="/verbalitlogo/whitelogo.png" 
          alt="Logo"
          width="55"
          height="55"
          className="cursor-pointer"
        />
      </Link>

      {/* Desktop Navigation */}
      <ul className="hidden md:flex items-center space-x-8">
        <li>
          <Link href="/" className="hover:text-yellow-400 transition-colors">
            Verbal
          </Link>
        </li>
        <li>
          <Link href="/moodboard" className="hover:text-yellow-400 transition-colors">
            Canvas
          </Link>
        </li>
        <li>
          <Link href="/journal" className="hover:text-yellow-400 transition-colors">
            Journal
          </Link>
        </li>
        <li>
          <Link href="/calendar" className="hover:text-yellow-400 transition-colors">
            Workflow
          </Link>
        </li>
        <li>
          <Link href="/projects" className="hover:text-yellow-400 transition-colors">
            Workspace
          </Link>
        </li>
        <li>
          <Link href="/uplift" className="hover:text-yellow-400 transition-colors">
            Uplift
          </Link>
        </li>
        <div className="flex items-center space-x-4">
          <Link href="/membership">
            <span className="text-black hover:text-yellow-400 cursor-pointer">
              Pricing
            </span>
          </Link>
        </div>
      </ul>

      {/* Mobile Nav Icon */}
      <div onClick={handleNav} className="block md:hidden cursor-pointer">
        {/* Toggle icons: X vs hamburger */}
        {!navOpen ? (
          <span className="text-black text-2xl">☰</span>
        ) : (
          <span className="text-black text-2xl">✖</span>
        )}
      </div>

      {/* Mobile Menu */}
      <div
        className={`${
          navOpen ? "left-0" : "left-[-100%]"
        } fixed top-0 w-[60%] h-full border-r border-gray-900 bg-[#080606] ease-in-out duration-500`}
      >
        <div className="mx-auto my-4">
          <img
            src="/verbalitlogo/VictoryPath.png"
            alt="Mobile Logo"
            width="140"
            height="140"
          />
        </div>
        <ul className="space-y-4 p-4">
          <li>
            <Link
              href="/moodboard"
              className="text-white hover:text-yellow-400 transition-colors"
              onClick={handleNav}
            >
              Moodboard
            </Link>
          </li>
          <li>
            <Link
              href="/journal"
              className="text-white hover:text-yellow-400 transition-colors"
              onClick={handleNav}
            >
              Journal
            </Link>
          </li>
          <li>
            <Link
              href="/goals"
              className="text-white hover:text-yellow-400 transition-colors"
              onClick={handleNav}
            >
              Goals
            </Link>
          </li>
          {/* Add any other mobile links you want */}
          <li>
            <Link
              href="/membership"
              className="text-white hover:text-yellow-400 transition-colors"
              onClick={handleNav}
            >
              Pricing
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
