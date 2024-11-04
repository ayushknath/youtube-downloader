require("dotenv").config();
const path = require("path");
const { spawn } = require("child_process");
const prompt = require("prompt-sync")({ sigint: true });
const changeFileExtension = require("./jobs/mediaConvert");
const {
  textGreen,
  textRed,
  bgBlue,
  colorReset,
  outputPath,
  outputFilename,
} = require("./utils/constants");

let videoURL, mediaType, format, filename;
const resolution = 1080;

while (!videoURL) {
  videoURL = prompt("Paste the video URL: ");
}

// show choices
console.log("Choose format (1-3):");
console.log("1. Video only\n2. Audio only\n3. Video + Audio");

while (!mediaType || !(mediaType >= 1 && mediaType <= 3)) {
  mediaType = prompt("");
}

switch (mediaType) {
  case "1":
    format = `bv[height<=${resolution}]`;
    break;
  case "2":
    format = "ba";
    break;
  case "3":
    format = `bv[height<=${resolution}]+ba`;
    break;
}

const argList = [
  "-P",
  outputPath,
  "-o",
  outputFilename,
  "-f",
  format,
  //"-",
  videoURL,
  "--restrict-filenames",
];
const options = { stdio: ["inherit", "pipe", "pipe"] };

const ytdlp = spawn("yt-dlp", argList, options);

ytdlp.stdout.on("data", (data) => {
  const dataString = data.toString().trim();
  console.log(`${bgBlue}yt-dlp${colorReset}${dataString}`);

  // get filename
  if (
    (mediaType === "1" || mediaType === "2") &&
    dataString.includes("Destination:")
  ) {
    filename = path
      .basename(dataString.slice(dataString.indexOf(outputPath)))
      .trim();
  } else {
    if (dataString.includes("[Merger]")) {
      filename = path
        .basename(
          dataString.slice(
            dataString.indexOf(outputPath),
            dataString.length - 1
          )
        )
        .trim();
    }
  }
});

ytdlp.stderr.on("data", (data) => {
  console.log(
    `${bgBlue}yt-dlp${colorReset}${textRed}stderr${colorReset}: ${data.toString()}`
  );
});

ytdlp.on("close", (code) => {
  console.log(`parent process exited with code ${code}`);
  if (filename) {
    changeFileExtension(filename, path.parse(filename).ext, mediaType);
  }
});
