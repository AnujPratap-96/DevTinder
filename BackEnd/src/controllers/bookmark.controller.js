import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { upsertBookmark, listBookmarks, removeBookmark } from "../services/bookmark.service.js";

export const createBookmarkController = asyncHandler(async (req, res) => {
  const bookmark = await upsertBookmark({
    userId: req.user._id,
    savedUserId: req.body?.userId,
  });
  return successResponse(res, { message: "Bookmark created", data: { bookmark } });
});

export const listBookmarksController = asyncHandler(async (req, res) => {
  const data = await listBookmarks(req.user._id, req.query);
  return successResponse(res, { message: "Bookmarks fetched", data });
});

export const deleteBookmarkController = asyncHandler(async (req, res) => {
  const result = await removeBookmark({
    userId: req.user._id,
    savedUserId: req.params.userId,
  });
  return successResponse(res, { message: "Bookmark deleted", data: { deleted: !!result } });
});
