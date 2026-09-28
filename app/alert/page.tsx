"use client";

import { useEffect, useState } from "react";

export default function AlertPage() {
  const [active, setActive] =
    useState(true);

  useEffect(() => {
    if (!("vibrate" in navigator)) {
      return;
    }

    const pattern = [
      500,
      200,
      500,
      200,
      1000,
      500,
      500,
      200,
      500,
    ];

    navigator.vibrate(pattern);

    return () => {
      navigator.vibrate(0);
    };
  }, []);

  function stopAlert() {
    navigator.vibrate?.(0);
    setActive(false);
  }

  return (
    <main className="min-h-screen bg-red-950 text-white flex items-center justify-center p-6">

      <div className="w-full max-w-lg rounded-3xl border border-red-500/40 bg-red-900/40 p-8 text-center shadow-2xl">

        {active ? (
          <>
            <div className="text-7xl">
              🚨
            </div>

            <h1 className="mt-6 text-4xl font-black">
              EMERGENCY ALERT
            </h1>

            <p className="mt-6 text-xl">
              EARTHQUAKE WARNING
            </p>

            <p className="mt-3 text-red-200">
              Please move to a safe area.
            </p>

            <div className="mt-8 text-5xl">
              📳 🔊 📳
            </div>

            <button
              onClick={stopAlert}
              className="mt-10 w-full rounded-2xl bg-white px-6 py-4 text-lg font-bold text-red-900"
            >
              ACKNOWLEDGE / STOP
            </button>
          </>
        ) : (
          <>
            <div className="text-6xl">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-bold">
              Alert Acknowledged
            </h1>

            <p className="mt-3 text-red-200">
              The emergency alert has been stopped.
            </p>
          </>
        )}

      </div>

    </main>
  );
}
