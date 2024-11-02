require("dotenv").config();
const path = require("path");
const { spawn } = require("child_process");
const prompt = require("prompt-sync")({ sigint: true });
const changeFileExtension = require("./jobs/mediaConversion");
const {
  textGreen,
  textRed,
  bgBlue,
  colorReset,
  outputPath,
  outputFilename,
} = require("./utils/constants");

let videoURL;
while (true) {
  videoURL = prompt("Paste the video URL: ");
  // validate videoURL
  if (!videoURL) {
    console.log("No URL provided. Please try again.\n");
    continue;
  }
  break;
}

// Ask for only audio file
let audioOnly;
while (true) {
  audioOnly = prompt("Do you want audio only? (y/n): ");
  // validate audioOnly
  if (!["y", "n"].includes(audioOnly)) {
    console.log(
      "Please select a valid response 'y' for 'yes' or 'n' for 'no'.\n"
    );
    continue;
  }
  break;
}

const argList = [
  "-P",
  outputPath,
  "-o",
  outputFilename,
  "-f",
  `${audioOnly === "n" ? "bv[height<=1080]+ba" : "ba"}`,
  //"-",
  videoURL,
  "--restrict-filenames",
];
const options = {
  stdio: ["inherit", "pipe", "pipe"],
};

const ytdlp = spawn("yt-dlp", argList, options);

let filename;
ytdlp.stdout.on("data", (data) => {
  const dataString = data.toString();
  console.log(`${bgBlue}[yt-dlp]${colorReset}${dataString}`);

  // get filename
  if (audioOnly === "n") {
    if (dataString.includes("[Merger]")) {
      const dataStringTrimmed = dataString.trim();
      filename = path
        .basename(
          dataStringTrimmed.slice(
            dataStringTrimmed.indexOf(outputPath),
            dataStringTrimmed.length - 1
          )
        )
        .trim();
    }
  } else {
    if (dataString.includes("Destination:")) {
      filename = path
        .basename(dataString.slice(dataString.indexOf(outputPath)))
        .trim();
    }
  }
});

ytdlp.stderr.on("data", (data) => {
  console.error(
    `${bgBlue}[yt-dlp]${colorReset}${textRed}stderr${colorReset}: ${data.toString()}`
  );
});

// delete parent file
// const deleteParentFile = (filename) => {
//   fs.unlink(path.join(outputPath, filename), (err) => {
//     if (err) {
//       console.log(`${textRed}${err}${colorReset}`);
//     } else {
//       console.log(`${textGreen}Parent file deleted${colorReset}`);
//     }
//   });
// };

ytdlp.on("close", (code) => {
  console.log(`parent process exited with code ${code}`);
  if (filename) {
    changeFileExtension(filename, path.parse(filename).ext, audioOnly);
  }
});
