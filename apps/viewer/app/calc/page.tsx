"use client";
import { useEffect } from "react";
import CalcCompare from "../../src/routes/CalcCompare";
import { initializeTGO } from "../../src/boot";

export default function CalcPage() {
  useEffect(() => {
    // Initialize TGO system when calculator page loads
    initializeTGO();
  }, []);

  return <CalcCompare />;
}
