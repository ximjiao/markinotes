"use client";

import React from "react";
import type { ShapeType } from "../_types/whiteboard.types";

interface ShapeSvgRendererProps {
  shapeType: ShapeType;
  width: number;
  height: number;
  color: string;
  stroke?: string;
  strokeWidth?: number;
}

export function ShapeSvgRenderer({
  shapeType,
  width,
  height,
  color,
  stroke = "#0F172A",
  strokeWidth = 2,
}: ShapeSvgRendererProps) {
  const w = width;
  const h = height;

  switch (shapeType) {
    case "circle":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w / 2 - strokeWidth}
            ry={h / 2 - strokeWidth}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case "diamond":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w / 2},${strokeWidth} ${w - strokeWidth},${h / 2} ${w / 2},${h - strokeWidth} ${strokeWidth},${h / 2}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "triangle":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w / 2},${strokeWidth} ${w - strokeWidth},${h - strokeWidth} ${strokeWidth},${h - strokeWidth}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "triangle-down":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${strokeWidth},${strokeWidth} ${w - strokeWidth},${strokeWidth} ${w / 2},${h - strokeWidth}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "pill":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <rect
            x={strokeWidth}
            y={strokeWidth}
            width={w - strokeWidth * 2}
            height={h - strokeWidth * 2}
            rx={h / 2}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case "pentagon":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w / 2},${strokeWidth} ${w - strokeWidth},${h * 0.38} ${w * 0.81},${h - strokeWidth} ${w * 0.19},${h - strokeWidth} ${strokeWidth},${h * 0.38}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "octagon":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w * 0.3},${strokeWidth} ${w * 0.7},${strokeWidth} ${w - strokeWidth},${h * 0.3} ${w - strokeWidth},${h * 0.7} ${w * 0.7},${h - strokeWidth} ${w * 0.3},${h - strokeWidth} ${strokeWidth},${h * 0.7} ${strokeWidth},${h * 0.3}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "cross":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w * 0.35},${strokeWidth} ${w * 0.65},${strokeWidth} ${w * 0.65},${h * 0.35} ${w - strokeWidth},${h * 0.35} ${w - strokeWidth},${h * 0.65} ${w * 0.65},${h * 0.65} ${w * 0.65},${h - strokeWidth} ${w * 0.35},${h - strokeWidth} ${w * 0.35},${h * 0.65} ${strokeWidth},${h * 0.65} ${strokeWidth},${h * 0.35} ${w * 0.35},${h * 0.35}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "arrow-right":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${strokeWidth},${h * 0.25} ${w * 0.6},${h * 0.25} ${w * 0.6},${strokeWidth} ${w - strokeWidth},${h * 0.5} ${w * 0.6},${h - strokeWidth} ${w * 0.6},${h * 0.75} ${strokeWidth},${h * 0.75}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "arrow-left":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w - strokeWidth},${h * 0.25} ${w * 0.4},${h * 0.25} ${w * 0.4},${strokeWidth} ${strokeWidth},${h * 0.5} ${w * 0.4},${h - strokeWidth} ${w * 0.4},${h * 0.75} ${w - strokeWidth},${h * 0.75}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "star":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w * 0.5},${strokeWidth} ${w * 0.62},${h * 0.35} ${w - strokeWidth},${h * 0.38} ${w * 0.72},${h * 0.63} ${w * 0.8},${h - strokeWidth} ${w * 0.5},${h * 0.78} ${w * 0.2},${h - strokeWidth} ${w * 0.28},${h * 0.63} ${strokeWidth},${h * 0.38} ${w * 0.38},${h * 0.35}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "speech":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <path
            d={`M 12 ${strokeWidth} H ${w - 12} A 12 12 0 0 1 ${w - strokeWidth} 12 V ${h - 24} A 12 12 0 0 1 ${w - 12} ${h - 12} H 36 L 16 ${h - strokeWidth} V ${h - 12} H 12 A 12 12 0 0 1 ${strokeWidth} ${h - 24} V 12 A 12 12 0 0 1 12 ${strokeWidth} Z`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case "parallelogram":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w * 0.25},${strokeWidth} ${w - strokeWidth},${strokeWidth} ${w * 0.75},${h - strokeWidth} ${strokeWidth},${h - strokeWidth}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "cylinder":
    case "database":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <path
            d={`M ${strokeWidth} ${h * 0.2} V ${h * 0.8} A ${w / 2 - strokeWidth} ${h * 0.2} 0 0 0 ${w - strokeWidth} ${h * 0.8} V ${h * 0.2} A ${w / 2 - strokeWidth} ${h * 0.2} 0 0 0 ${strokeWidth} ${h * 0.2} Z`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <ellipse
            cx={w / 2}
            cy={h * 0.2}
            rx={w / 2 - strokeWidth}
            ry={h * 0.15}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case "cloud":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <path
            d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
            fill={color}
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "server":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <rect width="20" height="8" x="2" y="2" rx="2" fill={color} stroke={stroke} strokeWidth="1.5" />
          <rect width="20" height="8" x="2" y="14" rx="2" fill={color} stroke={stroke} strokeWidth="1.5" />
          <line x1="6" x2="6.01" y1="6" y2="6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="6" x2="6.01" y1="18" y2="18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "document":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <path
            d={`M ${strokeWidth} ${strokeWidth} H ${w - 24} L ${w - strokeWidth} 24 V ${h - strokeWidth} H ${strokeWidth} Z`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <path
            d={`M ${w - 24} ${strokeWidth} V 24 H ${w - strokeWidth}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case "folder":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <path
            d={`M ${strokeWidth} 16 L ${strokeWidth} ${h - strokeWidth} H ${w - strokeWidth} V 16 H ${w * 0.45} L ${w * 0.35} ${strokeWidth} H ${strokeWidth} V 16 Z`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "trapezoid":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w * 0.18},${strokeWidth} ${w * 0.82},${strokeWidth} ${w - strokeWidth},${h - strokeWidth} ${strokeWidth},${h - strokeWidth}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "hexagon":
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <polygon
            points={`${w * 0.22},${strokeWidth} ${w * 0.78},${strokeWidth} ${w - strokeWidth},${h * 0.5} ${w * 0.78},${h - strokeWidth} ${w * 0.22},${h - strokeWidth} ${strokeWidth},${h * 0.5}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "cube":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <path d="m21.12 6.4-9-5a2 2 0 0 0-2 0l-9 5A2 2 0 0 0 0 8.16v7.68a2 2 0 0 0 1.12 1.76l9 5a2 2 0 0 0 2 0l9-5A2 2 0 0 0 23 15.84V8.16a2 2 0 0 0-1.12-1.76z" fill={color} stroke={stroke} strokeWidth="1.5" />
          <path d="m3.29 7 8.71 4.84L20.71 7M12 12v9.5" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case "cpu":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <rect x="4" y="4" width="16" height="16" rx="2" fill={color} stroke={stroke} strokeWidth="1.5" />
          <rect x="8.5" y="8.5" width="7" height="7" rx="1" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "shield":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <path d="M20 13c0 5-8 9-8 9s-8-4-8-9V5l8-3 8 3z" fill={color} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );

    case "key":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <circle cx="7.5" cy="15.5" r="5.5" fill={color} stroke={stroke} strokeWidth="1.5" />
          <path d="m21 2-9.6 9.6M15.5 7.5l3 3M18.5 4.5l3 3" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "mail":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <rect width="20" height="16" x="2" y="4" rx="2" fill={color} stroke={stroke} strokeWidth="1.5" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case "terminal":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <rect width="20" height="16" x="2" y="4" rx="2" fill={color} stroke={stroke} strokeWidth="1.5" />
          <path d="m6 10 4 3-4 3M14 16h4" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "mobile":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <rect width="14" height="20" x="5" y="2" rx="2" fill={color} stroke={stroke} strokeWidth="1.5" />
          <path d="M12 18h.01" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "globe":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <circle cx="12" cy="12" r="10" fill={color} stroke={stroke} strokeWidth="1.5" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case "user":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <circle cx="12" cy="8" r="5" fill={color} stroke={stroke} strokeWidth="1.5" />
          <path d="M20 21a8 8 0 1 0-16 0" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "gear":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill={color} stroke={stroke} strokeWidth="1.5" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case "lightning":
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" className="absolute inset-0 pointer-events-none w-full h-full p-2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );

    default:
      // Rectangle / default
      return (
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          <rect
            x={strokeWidth}
            y={strokeWidth}
            width={w - strokeWidth * 2}
            height={h - strokeWidth * 2}
            rx={Math.min(24, Math.max(8, 14 * (w / 240)))}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
  }
}
