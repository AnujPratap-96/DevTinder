import { z } from "zod";

export const markNotificationsSchema = z.object({
  body: z.object({
    // Optional: when omitted the server marks ALL of the user's notifications
    // as read (used by the UI's auto-mark-on-open and "Mark read" actions).
    notificationIds: z.array(z.string()).optional(),
  }),
});

export const deleteNotificationParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Notification ID is required"),
  }),
});
