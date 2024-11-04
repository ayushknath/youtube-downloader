const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { textRed, bgBlue, colorReset } = require("../utils/constants");

const convertMediaffmpeg = async (outputPath, filename, mediaType) => {
  const options = { stdio: ["inherit", "pipe", "pipe"] };
  const argList =
    mediaType === "1"
      ? [
          "-i",
          path.join(outputPath, filename),
          "-c:v",
          "libx264",
          "-an",
          path.join(outputPath, `${path.parse(filename).name}.mp4`),
        ]
      : mediaType === "3"
      ? [
          "-i",
          path.join(outputPath, filename),
          "-c:v",
          "libx264",
          "-c:a",
          "aac",
          path.join(outputPath, `${path.parse(filename).name}.mp4`),
        ]
      : [
          "-i",
          path.join(outputPath, filename),
          "-vn",
          "-ar",
          "44100",
          "-ac",
          "2",
          "-b:a",
          "192k",
          path.join(outputPath, `${path.parse(filename).name}.mp3`),
        ];

  const ffmpeg = spawn("ffmpeg", argList, options);

  ffmpeg.stdout.on("data", (data) => {
    console.log(`${bgBlue}ffmpeg${colorReset}${data.toString()}`);
  });

  ffmpeg.stderr.on("data", (data) => {
    console.log(
      `${bgBlue}ffmpeg${colorReset}${textRed}stderr${colorReset}: ${data.toString()}`
    );
  });

  await new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) => {
      console.log(`convertMediaffmpeg exited with code ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
};

module.exports = convertMediaffmpeg;
