export const changeFullScreenContainerText = (data) => {
  const fullScreenContainerText = document.getElementById(
    "full-screen-container-text-turkish"
  );
  const fullScreenContainerTextEnglish = document.getElementById(
    "full-screen-container-text-english"
  );

  fullScreenContainerText.textContent = data.turkish;
  fullScreenContainerTextEnglish.textContent = data.english;
};

export const changeFullScreenContainerVisibility = (data) => {
  const fullScreenContainer = document.getElementById("full-screen-container");
  if (data == 1) {
    fullScreenContainer.style.display = "block";
  } else {
    fullScreenContainer.style.display = "none";
  }
};
