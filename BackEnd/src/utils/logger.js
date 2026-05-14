const levels = ["error", "warn", "info", "debug"];

const formatMessage = (level, messages) => {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}]`, level.toUpperCase() + ":", ...messages];
};

const logger = levels.reduce((acc, level) => {
  acc[level] = (...messages) => {
    const formatted = formatMessage(level, messages);
    if (level === "error") {
      console.error(...formatted);
    } else if (level === "warn") {
      console.warn(...formatted);
    } else {
      console.log(...formatted);
    }
  };
  return acc;
}, {});

export default logger;
