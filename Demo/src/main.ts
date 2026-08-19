import { mount } from "svelte";
import "./styles/global.css";
import App from "./App.svelte";
import { Updato } from "@nellowtcs/updato";
import { UpdateNotification } from "@nellowtcs/updato/update-ui";

declare const __BUILD_HASH__: string;

mount(App, { target: document.getElementById("app")! });

const updater = Updato.init(
  {
    repo: "NellowTCS/Ichikara",
    mode: "commit",
    current: __BUILD_HASH__,
  },
  {
    onUpdate: (info) => {
      new UpdateNotification(updater, {
        heading: `Update (${info.latest.slice(0, 7)}) available`,
        buttonText: "Apply",
      }).show(info);
    },
    onError: (err) => console.warn("[updato]", err.message),
  },
);
