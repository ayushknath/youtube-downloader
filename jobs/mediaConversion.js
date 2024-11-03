const fs = require("fs");
const path = require("path");
const axios = require("axios");
const CloudConvert = require("cloudconvert");
const { showEllipsis, showProgress } = require("../utils/displayUtils");
const { textGreen, textRed, colorReset } = require("../utils/constants");

const cloudConvert = new CloudConvert(process.env.LIVE_API);
const outputPath = process.env.OUTPUT_PATH;

// converter function
const convertMediaFile = async (filename, outputFormat) => {
  let job;
  try {
    job = await cloudConvert.jobs.create({
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
  } catch (err) {
    console.log(`Job creation error: ${err.message}`);
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
    console.log(`Upload error: ${err.message}`);
  } finally {
    clearInterval(uploadInterval);
  }

  // processing stage
  const processingInterval = showEllipsis("Processing");
  try {
    job = await cloudConvert.jobs.wait(job.id);
  } catch (err) {
    console.log(`Processing error: ${err.message}`);
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
    console.log(`Download error: ${err.message}`);
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
const changeFileExtension = async (filename, extension, audioOnly) => {
  const targetFormat = audioOnly === "n" ? "mp4" : "mp3";
  if (extension === `.${targetFormat}`) {
    console.log(
      `${filename} is in the desired format. No conversion is needed.`
    );
  } else {
    console.log(
      `Converting ${filename} to ${path.parse(filename).name}.${targetFormat}`
    );
    try {
      await convertMediaFile(filename, targetFormat);
    } catch (err) {
      console.log(`Error during conversion: ${err.message}`);
    }
  }
  deleteParentFile(filename);
};

module.exports = changeFileExtension;
