import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { firebaseMessaging } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const alert_id = body.alertId || body.alert_id;

    if (!alert_id) {
      return NextResponse.json(
        { error: "alertId is required" },
        { status: 400 }
      );
    }

    // 1. Initialize server-side Supabase client (prefer service role key for full privileges)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase server credentials are not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Find the alert in the database
    const { data: alert, error: alertError } = await supabase
      .from("alerts")
      .select("*")
      .eq("id", alert_id)
      .single();

    if (alertError || !alert) {
      return NextResponse.json(
        { error: `Alert not found: ${alertError?.message || alert_id}` },
        { status: 404 }
      );
    }

    // 3. Find the recipient and get their fcm_token
    const { data: recipient, error: recipientError } = await supabase
      .from("recipients")
      .select("*")
      .eq("id", alert.recipient_id)
      .single();

    if (recipientError || !recipient) {
      await supabase
        .from("alerts")
        .update({ status: "failed" })
        .eq("id", alert_id);

      return NextResponse.json(
        { error: `Recipient not found: ${recipientError?.message || alert.recipient_id}` },
        { status: 404 }
      );
    }

    if (!recipient.fcm_token) {
      await supabase
        .from("alerts")
        .update({ status: "failed" })
        .eq("id", alert_id);

      return NextResponse.json(
        {
          error:
            "Recipient has no registered device token. Please click 'Register This Device' first.",
        },
        { status: 400 }
      );
    }

    // 4. Send FCM message via Firebase Admin
    const alertTitle =
      alert.alert_type === "earthquake"
        ? "🚨 EARTHQUAKE WARNING"
        : `🚨 ${(alert.alert_type || "EMERGENCY").toUpperCase()} ALERT`;

    const messagePayload = {
      token: recipient.fcm_token,
      notification: {
        title: alertTitle,
        body: alert.message,
      },
      data: {
        alert_id: String(alert.id),
        alert_type: String(alert.alert_type || "emergency"),
        vibration_pattern: String(alert.vibration_pattern || "earthquake"),
        duration_seconds: String(alert.duration_seconds || 30),
        message: String(alert.message),
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title: alertTitle,
          body: alert.message,
          icon: "/next.svg",
          requireInteraction: true,
          vibrate: [500, 250, 500, 250, 500, 250, 500],
        },
      },
      android: {
        priority: "high" as const,
        notification: {
          channelId: "emergency_alerts",
          priority: "max" as const,
          defaultVibrateTimings: true,
        },
      },
    };

    const messageId = await firebaseMessaging.send(messagePayload);

    // 6. Update alert status to delivered
    await supabase
      .from("alerts")
      .update({
        status: "delivered",
      })
      .eq("id", alert_id);

    return NextResponse.json(
      {
        success: true,
        messageId,
        alert_id,
        recipient: {
          id: recipient.id,
          name: recipient.name,
          phone_number: recipient.phone_number,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error in /api/send-alert:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
