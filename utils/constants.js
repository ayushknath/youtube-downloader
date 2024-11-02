// ascii color codes
const textGreen = "\033[32m";
const textRed = "\033[31m";
const bgBlue = "\033[44m";
const colorReset = "\033[0m";

// output parameters
const outputPath = process.env.OUTPUT_PATH;
const outputFilename = "%(title)s.%(ext)s";

module.exports = {
  textGreen,
  textRed,
  bgBlue,
  colorReset,
  outputPath,
  outputFilename,
};
