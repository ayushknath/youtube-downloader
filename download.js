const { spawn } = require("child_process");
const prompt = require("prompt-sync")({ sigint: true });
const path = require("path");
const fs = require("fs");

// ascii color codes
const textGreen = "\033[32m";
const textRed = "\033[31m";
const bgBlue = "\033[44m";
const colorReset = "\033[0m";

const outputPath = "C:\\Users\\Ayush Kumar Nath\\Downloads\\Youtube";
const outputFilename = "%(title)s.%(ext)s";

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
  `${audioOnly === "n" ? "bv+ba" : "ba"}`,
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
const deleteParentFile = (filename) => {
  fs.unlink(path.join(outputPath, filename), (err) => {
    if (err) {
      console.log(`${textRed}${err}${colorReset}`);
    } else {
      console.log(`${textGreen}Parent file deleted${colorReset}`);
    }
  });
};

// convert to mp4
const convertTomp4 = (filename) => {
  const ffmpeg = spawn("ffmpeg", [
    "-i",
    path.join(outputPath, filename),
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    path.join(outputPath, `${path.parse(filename).name}.mp4`),
  ]);

  ffmpeg.stdout.on("data", (data) => {
    console.log(`${bgBlue}[ffmpeg]${colorReset}${data.toString()}`);
  });

  ffmpeg.stderr.on("data", (data) => {
    console.log(
      `${bgBlue}[ffmpeg]${colorReset}${textRed}stderr${colorReset}: ${data.toString()}`
    );
  });

  ffmpeg.on("close", (code) => {
    console.log(`convertTomp4 exited with code ${code}`);
    if (code === 0) {
      console.log(`${textGreen}Conversion successful${colorReset}`);
      deleteParentFile(filename);
    } else {
      console.log(`${textRed}Conversion unsuccessful${colorReset}`);
    }
  });
};

// convert to mp3
const convertTomp3 = (filename) => {
  const ffmpeg = spawn("ffmpeg", [
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
  ]);

  ffmpeg.stdout.on("data", (data) => {
    console.log(`${bgBlue}[ffmpeg]${colorReset}${data.toString()}`);
  });

  ffmpeg.stderr.on("data", (data) => {
    console.log(
      `${bgBlue}[ffmpeg]${colorReset}${textRed}stderr${colorReset}: ${data.toString()}`
    );
  });

  ffmpeg.on("close", (code) => {
    console.log(`convertTomp3 exited with code ${code}`);
    if (code === 0) {
      console.log(`${textGreen}Conversion successful${colorReset}`);
      deleteParentFile(filename);
    } else {
      console.log(`${textRed}Conversion unsuccessful${colorReset}`);
    }
  });
};

// conversion driver function
const changeFileExtension = (filename, extension) => {
  if (audioOnly === "n") {
    if (extension === ".mp4") {
      console.log(`Video is in ${extension} format. No changes were made`);
    } else {
      console.log(`Converting ${filename} to ${path.parse(filename).name}.mp4`);
      convertTomp4(filename);
    }
  } else {
    if (extension === ".mp3") {
      console.log(`Audio is in ${extension} format. No changes were made`);
    } else {
      console.log(`Converting ${filename} to ${path.parse(filename).name}.mp3`);
      convertTomp3(filename);
    }
  }
};

ytdlp.on("close", (code) => {
  console.log(`parent process exited with code ${code}`);
  if (filename) {
    changeFileExtension(filename, path.parse(filename).ext);
  }
});
