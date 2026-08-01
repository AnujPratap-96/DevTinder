import { z } from "zod";

export const markNotificationsSchema = z.object({
  body: z.object({
    notificationIds: z.array(z.string()).min(1, "At least one notification ID is required"),
  }),
});

export const deleteNotificationParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Notification ID is required"),
  }),
});
