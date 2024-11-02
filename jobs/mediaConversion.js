const fs = require("fs");
const path = require("path");
const axios = require("axios");
const CloudConvert = require("cloudconvert");
const { showEllipsis, showProgress } = require("../utils/displayUtils");

const cloudConvert = new CloudConvert(process.env.LIVE_API);

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
      showProgress(downloadedBytes, totalBytes, "Downloading");
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
  const targetFormat = audioOnly === "n" ? "mp4" : "mp3";
  if (extension === `.${targetFormat}`) {
    console.log(
      `${filename} is in the desired format. No conversion is needed.`
    );
  } else {
    console.log(
      `Converting ${filename} to ${path.parse(filename).name}.${targetFormat}`
    );
    convertMediaFile(filename, targetFormat);
  }
};

module.exports = changeFileExtension;
