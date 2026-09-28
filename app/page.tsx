"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  registerForPushNotifications,
} from "@/lib/firebase-messaging";

type Recipient = {
  id: string;
  name: string;
  phone_number: string;
};

export default function Home() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [message, setMessage] = useState(
    "EARTHQUAKE WARNING - Please move to a safe area."
  );

  const [alertType, setAlertType] = useState("earthquake");
  const [vibrationPattern, setVibrationPattern] =
    useState("earthquake");

  const [duration, setDuration] = useState(30);

  const [loading, setLoading] = useState(false);
  const [messageStatus, setMessageStatus] = useState("");

  async function registerDevice() {
    if (!selectedRecipient) {
      setMessageStatus(
        "Please select a recipient first."
      );
      return;
    }

    try {
      setMessageStatus(
        "Requesting notification permission..."
      );

      const token =
        await registerForPushNotifications();

      if (!token) {
        throw new Error(
          "Could not obtain Firebase device token."
        );
      }

      const { error } = await supabase
        .from("recipients")
        .update({
          fcm_token: token,
          device_platform: "web",
          device_registered_at:
            new Date().toISOString(),
        })
        .eq("id", selectedRecipient);

      if (error) {
        throw error;
      }

      setMessageStatus(
        "✅ Device registered successfully."
      );

    } catch (error) {
      console.error(error);

      setMessageStatus(
        "❌ Failed to register this device."
      );
    }
  }

  useEffect(() => {
    loadRecipients();
  }, []);

  async function loadRecipients() {
    const { data, error } = await supabase
      .from("recipients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setRecipients(data || []);
  }

  async function addRecipient(e: FormEvent) {
    e.preventDefault();

    if (!name || !phoneNumber) {
      setMessageStatus("Please enter a name and phone number.");
      return;
    }

    const { data, error } = await supabase
      .from("recipients")
      .insert({
        name,
        phone_number: phoneNumber,
      })
      .select()
      .single();

    if (error) {
      setMessageStatus(error.message);
      return;
    }

    setRecipients((current) => [data, ...current]);
    setSelectedRecipient(data.id);

    setName("");
    setPhoneNumber("");

    setMessageStatus("Recipient added successfully.");
  }

  async function sendAlert(e: FormEvent) {
    e.preventDefault();

    if (!selectedRecipient) {
      setMessageStatus(
        "Please select a recipient."
      );
      return;
    }

    if (!message.trim()) {
      setMessageStatus(
        "Please enter an alert message."
      );
      return;
    }

    setLoading(true);
    setMessageStatus("Creating alert...");

    try {
      // 1. Create alert in Supabase
      const { data: alert, error } =
        await supabase
          .from("alerts")
          .insert({
            recipient_id: selectedRecipient,
            message,
            alert_type: alertType,
            vibration_pattern:
              vibrationPattern,
            duration_seconds: duration,
            status: "pending",
          })
          .select()
          .single();

      if (error || !alert) {
        throw new Error(
          error?.message ||
          "Could not create alert."
        );
      }

      // 2. Send through Firebase
      setMessageStatus(
        "Sending notification..."
      );

      const response = await fetch(
        "/api/send-alert",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            alertId: alert.id,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          "Failed to send notification."
        );
      }

      setMessageStatus(
        `🚨 Alert sent to ${result.recipient.name}`
      );

    } catch (error) {
      console.error(error);

      setMessageStatus(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Failed to send alert."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}

        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-red-400">
                Emergency Communication
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Phone Alert System
              </h1>

              <p className="mt-2 text-slate-400">
                Send emergency alerts to registered devices.
              </p>
            </div>

            <div className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
              ● System Online
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* SEND ALERT */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">

            <div className="mb-6">
              <h2 className="text-2xl font-semibold">
                🚨 Send Alert
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Select a registered recipient and configure the alert.
              </p>
            </div>

            <form onSubmit={sendAlert} className="space-y-5">

              {/* RECIPIENT */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Recipient
                </label>

                <select
                  value={selectedRecipient}
                  onChange={(e) =>
                    setSelectedRecipient(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
                >
                  <option value="">
                    Select phone number
                  </option>

                  {recipients.map((recipient) => (
                    <option
                      key={recipient.id}
                      value={recipient.id}
                    >
                      {recipient.name} — {recipient.phone_number}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={registerDevice}
                  className="mt-3 w-full rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 font-semibold text-blue-400 hover:bg-blue-500/20"
                >
                  📱 Register This Device
                </button>
              </div>

              {/* MESSAGE */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Alert Message
                </label>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
                />
              </div>

              {/* OPTIONS */}

              <div className="grid gap-4 md:grid-cols-3">

                <div>
                  <label className="mb-2 block text-sm">
                    Alert Type
                  </label>

                  <select
                    value={alertType}
                    onChange={(e) =>
                      setAlertType(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option value="earthquake">
                      Earthquake
                    </option>

                    <option value="emergency">
                      Emergency
                    </option>

                    <option value="evacuation">
                      Evacuation
                    </option>

                    <option value="general">
                      General
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm">
                    Vibration
                  </label>

                  <select
                    value={vibrationPattern}
                    onChange={(e) =>
                      setVibrationPattern(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option value="earthquake">
                      Earthquake
                    </option>

                    <option value="continuous">
                      Continuous
                    </option>

                    <option value="pulse">
                      Pulse
                    </option>

                    <option value="short">
                      Short
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm">
                    Duration
                  </label>

                  <select
                    value={duration}
                    onChange={(e) =>
                      setDuration(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={120}>2 minutes</option>
                  </select>
                </div>

              </div>

              {/* STATUS */}

              {messageStatus && (
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm">
                  {messageStatus}
                </div>
              )}

              {/* SEND BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "SENDING..."
                  : "🚨 SEND ALERT"}
              </button>

            </form>
          </section>

          {/* ADD RECIPIENT */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="text-xl font-semibold">
              Add Recipient
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Register a phone number.
            </p>

            <form
              onSubmit={addRecipient}
              className="mt-6 space-y-4"
            >

              <div>
                <label className="mb-2 block text-sm">
                  Name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Juan Dela Cruz"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Phone Number
                </label>

                <input
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(e.target.value)
                  }
                  placeholder="09171234567"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-semibold hover:bg-slate-700"
              >
                + Add Recipient
              </button>

            </form>

          </section>

        </div>

        {/* RECIPIENT LIST */}

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Registered Recipients
              </h2>

              <p className="text-sm text-slate-400">
                {recipients.length} registered phone number(s)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>

                {recipients.map((recipient) => (
                  <tr
                    key={recipient.id}
                    className="border-b border-slate-800"
                  >
                    <td className="px-4 py-3 font-medium">
                      {recipient.name}
                    </td>

                    <td className="px-4 py-3">
                      {recipient.phone_number}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-500/10 px-3 py-1 text-green-400">
                        Registered
                      </span>
                    </td>
                  </tr>
                ))}

                {recipients.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No recipients registered yet.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>
    </main>
  );
}