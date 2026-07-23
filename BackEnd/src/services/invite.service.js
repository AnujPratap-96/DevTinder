import Invite from "../models/invite.js";
import * as inviteRepo from "../repositories/invite.repository.js";
import User from "../models/user.model.js";
import { run as sendEmail } from "../utils/sendEmail.js";
import { inviteEmailTemplate } from "../utils/emailTemplates/templates.js";
import { emitToUser } from "../utils/socket.js";
import { AppError, ValidationError } from "../errors/index.js";
import { getPlanLimits } from "../utils/planConfig.js";
import { checkMonthlyUsage } from "../utils/usage.js";

export const sendInvite = async ({ userId, email }) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError({ message: "User not found", statusCode: 404 });

  if (user.emailId.toLowerCase() === email.toLowerCase()) {
    throw new ValidationError("You cannot invite yourself");
  }

  const existingUser = await User.findOne({ emailId: email.toLowerCase() });
  if (existingUser) {
    throw new ValidationError("This person is already on DevTinder");
  }

  const pending = await inviteRepo.findInvite({
    email: email.toLowerCase(),
    status: "pending",
  });
  if (pending) {
    throw new ValidationError("This person has already been invited");
  }

  const invite = await inviteRepo.createInvite({
    senderId: userId,
    email: email.toLowerCase(),
  });

  const senderName = `${user.firstName} ${user.lastName || ""}`.trim();

  try {
    const subject = `${senderName} invited you to DevTinder!`;
    const html = inviteEmailTemplate({ senderName });
    await sendEmail(subject, html, email);
  } catch (err) {
    await inviteRepo.updateInvite({ _id: invite._id }, { status: "cancelled" });
    throw new AppError({ message: "Failed to send invite email. Please try again.", statusCode: 500 });
  }

  return { sent: true, invite };
};

export const getStats = async (userId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalSent, pendingCount, acceptedCount] = await Promise.all([
    inviteRepo.countInvites({
      senderId: userId,
      createdAt: { $gte: startOfMonth },
      status: { $ne: "cancelled" },
    }),
    inviteRepo.countInvites({ senderId: userId, status: "pending" }),
    inviteRepo.countInvites({ senderId: userId, status: "accepted" }),
  ]);

  const planLimits = await getPlanLimits("free");
  const rawLimit = planLimits.invitesPerMonth;
  const limit = rawLimit === null || rawLimit === undefined ? Infinity : rawLimit;

  return {
    totalSent,
    remaining: Math.max(0, limit - totalSent),
    limit: rawLimit,
    pending: pendingCount,
    accepted: acceptedCount,
  };
};

export const listInvites = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const filter = { senderId: userId };

  const [invites, total] = await Promise.all([
    inviteRepo.findInvites(filter, { skip, limit }),
    inviteRepo.countInvites(filter),
  ]);

  return { invites, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const cancelInvite = async ({ userId, inviteId }) => {
  const invite = await inviteRepo.findInvite({ _id: inviteId, senderId: userId });
  if (!invite) throw new AppError({ message: "Invite not found", statusCode: 404 });
  if (invite.status !== "pending") throw new ValidationError("Can only cancel pending invites");

  await inviteRepo.updateInvite({ _id: inviteId }, { status: "cancelled" });
  return { cancelled: true };
};

export const acceptInviteByEmail = async ({ email, acceptedBy }) => {
  const invites = await inviteRepo.updateInvites(
    { email: email.toLowerCase(), status: "pending" },
    { status: "accepted", acceptedAt: new Date(), acceptedBy }
  );
  if (invites.modifiedCount > 0) {
    const accepted = await inviteRepo.findInvites({ email: email.toLowerCase(), status: "accepted" });
    accepted.forEach((inv) => {
      emitToUser(inv.senderId, "invite:accepted", { email });
    });
  }
  return invites;
};
