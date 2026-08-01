import Project from "../models/project.js";

export const findProjectById = (id) => Project.findById(id);

export const findProjects = (filter = {}, { limit = 20, cursor = null, sort = { createdAt: -1 } } = {}) => {
  const query = { ...filter };
  if (cursor) query._id = { $lt: cursor };
  return Project.find(query).sort(sort).limit(limit + 1).lean();
};

export const createProject = (payload) => Project.create(payload);

export const findAndPopulateProject = (id, populateOpts = []) => {
  let query = Project.findById(id);
  for (const opt of populateOpts) {
    query = query.populate(opt);
  }
  return query;
};

export const findAndPopulateProjects = (filter = {}, populateOpts = [], { limit = 20, cursor = null, sort = { createdAt: -1 } } = {}) => {
  const query = { ...filter };
  if (cursor) query._id = { $lt: cursor };
  let q = Project.find(query).sort(sort).limit(limit + 1);
  for (const opt of populateOpts) {
    q = q.populate(opt);
  }
  return q.lean();
};

export const deleteProjectById = (id) => Project.findByIdAndDelete(id);

export const deleteAllProjects = () => Project.deleteMany({});

export const saveProject = (project) => project.save();
