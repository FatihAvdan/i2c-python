import * as FullScreenContainer from "./fullScreenContainer.js";

const Modules = {
  ...FullScreenContainer,
};

Object.entries(Modules).forEach(([key, value]) => {
  window[key] = value;
});
