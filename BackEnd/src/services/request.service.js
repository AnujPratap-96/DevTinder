import { createNotification } from "../repositories/notification.repository.js";
import {
  createConnectionRequest,
  findConnectionRequest,
} from "../repositories/connectionRequest.repository.js";
import { findUserById } from "../repositories/user.repository.js";
import { AppError, ValidationError } from "../errors/index.js";
import { getIO } from "../utils/socket.js";

const ALLOWED_SEND_STATUS = ["ignored", "interested"];
const ALLOWED_REVIEW_STATUS = ["accepted", "rejected"];

export const sendConnectionRequest = async ({ fromUser, toUserId, status }) => {
  if (!ALLOWED_SEND_STATUS.includes(status)) {
    throw new ValidationError("Invalid status");
  }

  const toUser = await findUserById(toUserId);
  if (!toUser) {
    throw new AppError({ message: "Target user not found", statusCode: 404 });
  }

  if (
    (fromUser.blockedUsers ?? []).some((id) => id.equals(toUser._id)) ||
    (toUser.blockedUsers ?? []).some((id) => id.equals(fromUser._id))
  ) {
    throw new AppError({ message: "Cannot connect with this user", statusCode: 403 });
  }

  const existing = await findConnectionRequest({
    $or: [
      { fromUserId: fromUser._id, toUserId },
      { fromUserId: toUserId, toUserId: fromUser._id },
    ],
  });

  if (existing) {
    throw new ValidationError("Connection request already exists", existing);
  }

  const request = await createConnectionRequest({
    fromUserId: fromUser._id,
    toUserId,
    status,
  });

  await createNotification({
    userId: toUser._id,
    type: "connection.request",
    payload: {
      fromUserId: fromUser._id,
      requestId: request._id,
      status,
    },
  });

  return request;
};

export const reviewConnectionRequest = async ({ requestId, status, reviewer }) => {
  if (!ALLOWED_REVIEW_STATUS.includes(status)) {
    throw new ValidationError("Invalid status");
  }

  const request = await findConnectionRequest({
    _id: requestId,
    toUserId: reviewer._id,
    status: "interested",
  });

  if (!request) {
    throw new AppError({ message: "Connection Request not found", statusCode: 404 });
  }

  request.status = status;
  const updated = await request.save();

  await createNotification({
    userId: request.fromUserId,
    type: "connection.response",
    payload: {
      toUserId: reviewer._id,
      status,
      requestId,
    },
  });

  if (status === "accepted") {
    const io = getIO();
    if (io) {
      const fromUser = await findUserById(request.fromUserId).select("firstName lastName photoUrl");
      const toUser = reviewer;
      const matchPayload = {
        users: [
          { _id: fromUser._id, firstName: fromUser.firstName, photoUrl: fromUser.photoUrl },
          { _id: toUser._id, firstName: toUser.firstName, photoUrl: toUser.photoUrl },
        ],
        matchAt: new Date(),
      };
      io.emit(`match:found:${fromUser._id}`, matchPayload);
      io.emit(`match:found:${toUser._id}`, matchPayload);
    }
  }

  return updated;
};
