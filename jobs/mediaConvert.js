const fs = require("fs");
const path = require("path");
const axios = require("axios");
const CloudConvert = require("cloudconvert");
const { showEllipsis, showProgress } = require("../utils/displayUtils");
const {
  textGreen,
  textRed,
  colorReset,
  outputPath,
} = require("../utils/constants");
const convertMediaffmpeg = require("./mediaConvertffmpeg");

const cloudConvert = new CloudConvert(process.env.LIVE_API);

// converter function
const convertMedia = async (filename, targetFormat) => {
  let job;
  const cloudConvertError = new Error(
    "CloudConvert could not process the file"
  );
  try {
    job = await cloudConvert.jobs.create({
      tasks: {
        "upload-file": {
          operation: "import/upload",
        },
        "convert-file": {
          operation: "convert",
          output_format: targetFormat,
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
  } catch (err) {
    throw cloudConvertError;
  }

  // uploading stage
  const uploadInterval = showEllipsis("Uploading file");
  const inputFile = fs.createReadStream(path.join(outputPath, filename));
  try {
    await cloudConvert.tasks.upload(
      job.tasks.filter((task) => task.name === "upload-file")[0],
      inputFile
    );
  } catch (err) {
    clearInterval(uploadInterval);
    throw cloudConvertError;
  } finally {
    clearInterval(uploadInterval);
  }

  // processing stage
  const processingInterval = showEllipsis("Processing");
  try {
    job = await cloudConvert.jobs.wait(job.id);
  } catch (err) {
    clearInterval(processingInterval);
    throw cloudConvertError;
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
      showProgress(downloadedBytes, totalBytes, "Downloading");
    });
    res.data.pipe(outputFile);
    await new Promise((resolve, reject) => {
      res.data.on("end", () => {
        console.log("\nDownload complete");
        resolve();
      });

      res.data.on("error", (err) => {
        reject(new Error(`Download error: ${err.message}`));
      });
    });
  } catch (err) {
    throw cloudConvertError;
  }
};

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

// conversion driver function
const changeFileExtension = async (filename, extension, mediaType) => {
  const targetFormat = mediaType === "1" || mediaType === "3" ? "mp4" : "mp3";

  if (extension === `.${targetFormat}`) {
    console.log(
      `${filename} is in the desired format. No conversion is needed.`
    );
  } else {
    console.log(
      `Converting ${filename} to ${path.parse(filename).name}.${targetFormat}`
    );
    try {
      await convertMedia(filename, targetFormat);
    } catch (err) {
      console.log(`${textRed}CloudConvert Error${colorReset}: ${err.message}`);
      console.log("Using ffmpeg for conversion");
      try {
        await convertMediaffmpeg(outputPath, filename, mediaType);
      } catch (err) {
        console.log(`ffmpeg error: ${err.message}`);
      }
    }

    deleteParentFile(filename);
  }
};

module.exports = changeFileExtension;
