import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { upsertBookmark, listBookmarks } from "../services/bookmark.service.js";

export const createBookmarkController = asyncHandler(async (req, res) => {
  const bookmark = await upsertBookmark({
    userId: req.user._id,
    savedUserId: req.body?.userId,
  });
  return successResponse(res, { data: { bookmark } });
});

export const listBookmarksController = asyncHandler(async (req, res) => {
  const bookmarks = await listBookmarks(req.user._id);
  return successResponse(res, { data: { bookmarks } });
});
