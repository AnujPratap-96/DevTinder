import { emailQueue } from "./emailQueue.js";

const run = async (subject, body, toEmailId) => {
  await emailQueue.add('send-raw-email', {
    type: 'RAW_EMAIL',
    payload: { subject, body, toEmailId }
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

export { run };
