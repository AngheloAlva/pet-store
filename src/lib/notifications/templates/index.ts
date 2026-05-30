/**
 * Template registry for the demo email inbox (F2.8).
 *
 * Each template is a pure function: no React, no DB, no side effects.
 * HTML uses inline styles for email-client compatibility (Resend swap in F3).
 * Never embed raw user-controlled HTML in template output — interpolate as text.
 */

import type { DemoEmailType } from "@/db/schema";

import { render as renderAppointmentConfirmation } from "./appointment-confirmation";
import { render as renderAppointmentCanceled } from "./appointment-canceled";
import { render as renderAppointmentRescheduled } from "./appointment-rescheduled";
import { render as renderAppointmentReminder24h } from "./appointment-reminder-24h";
import { render as renderAppointmentReminder2h } from "./appointment-reminder-2h";
import { render as renderRestockAlert } from "./restock-alert";
import { render as renderWelcome } from "./welcome";
import { render as renderPointsAdjustment } from "./points-adjustment";
import { render as renderOther } from "./other";
import { render as renderOrderConfirmation } from "./order-confirmation";
import { render as renderSubscriptionReminder } from "./subscription-reminder";
import { render as renderSubscriptionPaymentFailed } from "./subscription-payment-failed";
import { render as renderShipmentDispatched } from "./shipment-dispatched";
import { render as renderShipmentDelivered } from "./shipment-delivered";
import { render as renderPickupReady } from "./pickup-ready";

import type { Data as AppointmentConfirmationData } from "./appointment-confirmation";
import type { Data as AppointmentCanceledData } from "./appointment-canceled";
import type { Data as AppointmentRescheduledData } from "./appointment-rescheduled";
import type { Data as AppointmentReminder24hData } from "./appointment-reminder-24h";
import type { Data as AppointmentReminder2hData } from "./appointment-reminder-2h";
import type { Data as RestockAlertData } from "./restock-alert";
import type { Data as WelcomeData } from "./welcome";
import type { Data as PointsAdjustmentData } from "./points-adjustment";
import type { Data as OtherData } from "./other";
import type { Data as OrderConfirmationData } from "./order-confirmation";
import type { Data as ShipmentDispatchedData } from "./shipment-dispatched";
import type { Data as ShipmentDeliveredData } from "./shipment-delivered";
import type { Data as PickupReadyData } from "./pickup-ready";
import type { Data as SubscriptionReminderData } from "./subscription-reminder";
import type { Data as SubscriptionPaymentFailedData } from "./subscription-payment-failed";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type TemplateData = {
  appointment_confirmation: AppointmentConfirmationData;
  appointment_canceled: AppointmentCanceledData;
  appointment_rescheduled: AppointmentRescheduledData;
  appointment_reminder_24h: AppointmentReminder24hData;
  appointment_reminder_2h: AppointmentReminder2hData;
  restock_alert: RestockAlertData;
  welcome: WelcomeData;
  points_adjustment: PointsAdjustmentData;
  order_confirmation: OrderConfirmationData;
  shipment_dispatched: ShipmentDispatchedData;
  shipment_delivered: ShipmentDeliveredData;
  pickup_ready: PickupReadyData;
  // F3.5 — subscription notifications
  subscription_reminder: SubscriptionReminderData;
  subscription_payment_failed: SubscriptionPaymentFailedData;
  other: OtherData;
};

export const TEMPLATES: { [K in DemoEmailType]: (data: TemplateData[K]) => RenderedEmail } = {
  appointment_confirmation: renderAppointmentConfirmation,
  appointment_canceled: renderAppointmentCanceled,
  appointment_rescheduled: renderAppointmentRescheduled,
  appointment_reminder_24h: renderAppointmentReminder24h,
  appointment_reminder_2h: renderAppointmentReminder2h,
  restock_alert: renderRestockAlert,
  welcome: renderWelcome,
  points_adjustment: renderPointsAdjustment,
  order_confirmation: renderOrderConfirmation,
  shipment_dispatched: renderShipmentDispatched,
  shipment_delivered: renderShipmentDelivered,
  pickup_ready: renderPickupReady,
  // F3.5 — subscription notifications
  subscription_reminder: renderSubscriptionReminder,
  subscription_payment_failed: renderSubscriptionPaymentFailed,
  other: renderOther,
};
