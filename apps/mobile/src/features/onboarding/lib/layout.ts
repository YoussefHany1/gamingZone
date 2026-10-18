import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

/** Width of one slide: the pager, the list layout math and the video all use it. */
export const SLIDE_WIDTH = width;

/** Height taken by the footer (dots + buttons). */
const CONTROLS_HEIGHT = 150;

/** Height a slide leaves for its own text panel under the video window. */
const SLIDE_PANEL_HEIGHT = 150;

/** Height of the video window above each slide's text panel. */
export const VIDEO_HEIGHT = height - CONTROLS_HEIGHT - SLIDE_PANEL_HEIGHT;
