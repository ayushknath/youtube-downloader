const { spawn } = require("child_process");
const prompt = require("prompt-sync")({ sigint: true });
const path = require("path");
const fs = require("fs");

const outputPath = "C:\\Users\\Ayush Kumar Nath\\Downloads\\Youtube";
const outputFilename = "%(title)s.%(ext)s";
const videoURL = prompt("Paste the video URL: ");

// Ask for only audio file
let audioOnly;
while (true) {
  audioOnly = prompt("Do you want audio only? (y/n): ");
  // validate audioOnly
  if (!["y", "n"].includes(audioOnly)) {
    console.log(
      "Please select a valid response 'y' for 'yes' and 'n' for 'no'\n"
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
  console.log(dataString);

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
  console.error("\033[31mstderr\033[0m: " + data.toString());
});

// delete parent file
const deleteParentFile = (filename) => {
  fs.unlink(path.join(outputPath, filename), (err) => {
    if (err) {
      console.log("\033[31m" + err + "\033[0m");
    } else {
      console.log("\033[32mParent file deleted\033[0m");
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
    console.log(data.toString());
  });

  ffmpeg.stderr.on("data", (data) => {
    console.log("\033[31mstderr\033[0m: " + data.toString());
  });

  ffmpeg.on("close", (code) => {
    console.log(`convertTomp4 exited with code ${code}`);
    if (code === 0) {
      console.log("\033[32mConversion successful\033[0m");
      deleteParentFile(filename);
    } else {
      console.log("\033[31mConversion unsuccessful\033[0m");
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
    console.log(data.toString());
  });

  ffmpeg.stderr.on("data", (data) => {
    console.log("\033[31mstderr\033[0m: " + data.toString());
  });

  ffmpeg.on("close", (code) => {
    console.log(`convertTomp3 exited with code ${code}`);
    if (code === 0) {
      console.log("\033[32mConversion successful\033[0m");
      deleteParentFile(filename);
    } else {
      console.log("\033[31mConversion unsuccessful\033[0m");
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
