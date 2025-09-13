import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function MenuBar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const sessionId = location.pathname.split("/")[2];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: `/dashboard/${sessionId}`,
      icon: "📊",
    },
    {
      name: "Pending Requests",
      path: `/pending-requests/${sessionId}`,
      icon: "⏳",
    },
  ];

  return (
    <div className="relative">
      {/* Menu Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-100 focus:outline-none"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Sidebar Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pt-16 px-4">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors duration-200 ${
                location.pathname === item.path
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
