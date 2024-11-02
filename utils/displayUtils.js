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
function showProgress(current, total, prompt = "Progress") {
  const percent = current / total;
  const totalWidth = 30;
  const filledWidth = totalWidth * percent;
  const currentInMB = (current / 1e6).toFixed(2);
  const totalInMB = (total / 1e6).toFixed(2);

  process.stdout.write(`\r${prompt}: [`);
  for (let i = 1; i <= totalWidth; i++) {
    i <= filledWidth ? process.stdout.write("#") : process.stdout.write(".");
  }
  process.stdout.write(
    `] ${parseInt(percent * 100)}% ${currentInMB}/${totalInMB} (MB)`
  );
}

module.exports = { showEllipsis, showProgress };
