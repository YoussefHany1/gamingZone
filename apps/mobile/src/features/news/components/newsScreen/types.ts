import type { NavigationState, SceneRendererProps } from "react-native-tab-view";
import type { RouteShape } from "../../types";

/** Props for the news tab bar (mirrors the shape `TabView` passes to renderTabBar). */
export type NewsTabBarProps = SceneRendererProps & {
  navigationState: NavigationState<RouteShape>;
};
