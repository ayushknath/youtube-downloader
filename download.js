require("dotenv").config();
const axios = require("axios");
const CloudConvert = require("cloudconvert");
const { spawn } = require("child_process");
const prompt = require("prompt-sync")({ sigint: true });
const path = require("path");
const fs = require("fs");

// ascii color codes
const textGreen = "\033[32m";
const textRed = "\033[31m";
const bgBlue = "\033[44m";
const colorReset = "\033[0m";

const cloudConvert = new CloudConvert(process.env.LIVE_API);

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

// ellipsis function
function showEllipsis(action) {
  let i = 0;
  let interval = setInterval(() => {
    if (i > 3) {
      i = 0;
    }
    if (i === 0) {
      process.stdout.write("\r                                ");
      process.stdout.write(`\r${action}`);
    } else {
      process.stdout.write(".");
    }
    i++;
  }, 1000);
  return interval;
}

// progress bar function
function showProgress(current, total) {
  const percent = current / total;
  const totalWidth = 30;
  const filledWidth = totalWidth * percent;
  const currentInMB = (current / 1e6).toFixed(2);
  const totalInMB = (total / 1e6).toFixed(2);

  process.stdout.write("\rDownloading: [");
  for (let i = 1; i <= totalWidth; i++) {
    i <= filledWidth ? process.stdout.write("#") : process.stdout.write(".");
  }
  process.stdout.write(
    `] ${parseInt(percent * 100)}% ${currentInMB}/${totalInMB} (MB)`
  );
}

// converter function
async function convertMediaFile(filename, outputFormat) {
  let job = await cloudConvert.jobs.create({
    tasks: {
      "upload-file": {
        operation: "import/upload",
      },
      "convert-file": {
        operation: "convert",
        output_format: outputFormat,
        input: ["upload-file"],
      },
      "download-file": {
        operation: "export/url",
        input: ["convert-file"],
        inline: false,
        archive_multiple_files: false,
      },
    },
  });
  console.log(`Job created with id ${job.id}`);

  // uploading stage
  const uploadInterval = showEllipsis("Uploading file");
  const inputFile = fs.createReadStream(path.join(outputPath, filename));
  try {
    await cloudConvert.tasks.upload(
      job.tasks.filter((task) => task.name === "upload-file")[0],
      inputFile
    );
  } catch (err) {
    console.log(`Upload error: ${err}`);
  } finally {
    clearInterval(uploadInterval);
  }

  // processing stage
  const processingInterval = showEllipsis("Processing");
  try {
    job = await cloudConvert.jobs.wait(job.id);
  } catch (err) {
    console.log(`Processing error: ${err}`);
  } finally {
    clearInterval(processingInterval);
  }

  // download stage
  const file = job.tasks.filter((task) => task.name === "download-file")[0]
    .result.files[0];
  const outputFile = fs.createWriteStream(path.join(outputPath, file.filename));
  try {
    const res = await axios.get(file.url, {
      responseType: "stream",
    });

    // show progress bar
    const totalBytes = parseInt(res.headers["content-length"], 10);
    let downloadedBytes = 0;
    res.data.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      showProgress(downloadedBytes, totalBytes);
    });
    res.data.pipe(outputFile);
    res.data.on("end", () => {
      console.log("\nDownload complete");
    });
  } catch (err) {
    console.log(`Download error: ${err}`);
  }
}

// conversion driver function
const changeFileExtension = (filename, extension) => {
  if (audioOnly === "n") {
    if (extension === ".mp4") {
      console.log(`Video is in ${extension} format. No changes were made`);
    } else {
      console.log(`Converting ${filename} to ${path.parse(filename).name}.mp4`);
      convertMediaFile(filename, "mp4");
    }
  } else {
    if (extension === ".mp3") {
      console.log(`Audio is in ${extension} format. No changes were made`);
    } else {
      console.log(`Converting ${filename} to ${path.parse(filename).name}.mp3`);
      convertMediaFile(filename, "mp3");
    }
  }
};

ytdlp.on("close", (code) => {
  console.log(`parent process exited with code ${code}`);
  if (filename) {
    changeFileExtension(filename, path.parse(filename).ext);
  }
});
