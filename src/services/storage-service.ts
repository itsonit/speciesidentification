import { createStore } from "@stencil/store";

const StorageService = createStore({
  hintStatus: null,
  speciesGroup: null,
  view: ""
});

export default StorageService;
