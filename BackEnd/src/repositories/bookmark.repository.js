import Bookmark from "../models/bookmark.js";

export const findBookmarks = (filter, projection, options = {}) => {
  return Bookmark.find(filter, projection, options);
};

export const createBookmark = (payload) => {
  const bookmark = new Bookmark(payload);
  return bookmark.save();
};

export const deleteBookmark = (filter) => {
  return Bookmark.findOneAndDelete(filter);
};
